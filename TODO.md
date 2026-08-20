# TODO — Future Improvements

Features and improvements that may be implemented in the future.
Each item includes a description, rationale, and implementation notes.

---

## F1: Cache student lists in Redis

**Problem:** Every time a user enters the select_student state, the bot fetches the student list from the diary API. The student list rarely changes (maybe once per school year).

**Solution:** Cache the students response in Redis with a 1-hour TTL. Cache key: `students:<platform>:<platformUserId>`. Invalidate on logout and on `NoTokensError`.

**Implementation:** Add a cache check in `core/handlers.ts` `enterSelectStudent` before calling `fetchFromDnevnik`. On cache miss, fetch and store. On `NoTokensError` or logout, delete the cache key. ~15 lines of code, no new dependencies.

**Priority:** Medium. The original developer already noted this as a TODO in `selectStudentScene.ts` (line 11: `// TODO cache result`).

---

## F2: AsyncLocalStorage for request correlation in logs

**Problem:** The `reqId` is manually passed through BotContext and threaded into every logger call. In a multi-transport system with webhooks, background jobs, and diary API calls, it's easy to miss a logging site.

**Solution:** Use Node.js built-in `AsyncLocalStorage` to propagate a `traceId` implicitly. Wrap each incoming event handler in `asyncStorage.run({ traceId }, handler)`. The logger reads from the store automatically.

**Implementation:** Create `utils/trace.ts` with an `AsyncLocalStorage<{ traceId: string }>` instance. Update `utils/logger.ts` to read the traceId from the store and include it in every log line. In each transport's event handler, wrap the `handleEvent` call in `asyncStorage.run(...)`. ~30 lines, no new dependencies.

**Priority:** Low. The explicit `reqId` works. Adopt this if debugging across transports becomes painful or if the team grows.

---

## F3: Circuit breaker for Dnevnik API

**Problem:** When `dnevnik.egov66.ru` is down (502/504), each user request waits for the full HTTP timeout before getting an error response. During extended outages, the bot makes many useless timeout-bound requests.

**Solution:** Wrap `DnevnikClient.fetch()` in a circuit breaker. After N consecutive failures (or X% failure rate over a window), open the circuit. While open, immediately throw `DiaryUnavailableError` without making the HTTP request. After a reset timeout, try once (half-open state); if it succeeds, close the circuit.

**Implementation:** Use `opossum` (npm package) or implement a simple breaker (~50 lines). Wrap the fetch method in `DnevnikClient`. Configure: timeout 5s, error threshold 50%, reset timeout 30s. The existing error handling in `core/fetcher.ts` already maps `DnevnikClientExternalServerError` to a user-friendly message — the breaker just makes it faster.

**Priority:** Low. The diary API has low traffic from this bot. Add this if outages cause user-visible latency complaints.

---

## F4: Rate limiting per user

**Problem:** A user can spam buttons and trigger many concurrent diary API calls. While not adversarial, it wastes resources and could trigger rate-limiting on the diary server.

**Solution:** Redis-based rate limiter in the router, before any handler runs. Key: `ratelimit:<platform>:<platformUserId>`. Allow 10 requests per minute per user. If exceeded, reply with "Too many requests, please wait" and skip the handler.

**Implementation:** Add a `checkRateLimit(userId)` function using Redis INCR + EXPIRE. Call it in `handleEvent` before dispatching. ~20 lines. No new dependencies (Redis is already available).

**Priority:** Low. The user base is parents checking a diary, not adversarial actors. Add this if abuse is observed.

---

## F5: Structured config with Zod validation

**Problem:** The manual config validation in `config.ts` works but doesn't provide type inference or detailed error messages for complex nested config (e.g., per-transport settings).

**Solution:** Replace manual validation with Zod schemas. Get type inference from `z.infer<typeof configSchema>` and detailed error messages for free.

**Implementation:** `npm install zod`. Define the schema with nested objects for each transport. `z.parse(process.env)` gives both validation and types.

**Priority:** Low. The manual validation is 30 lines and works. Zod is a dependency for slightly nicer DX. Adopt if config grows complex (e.g., per-transport rate limits, feature flags, region settings).

---

## F6: Health check endpoint

**Problem:** In production with multiple transports, there's no way to check if all bots are alive without manually testing each one.

**Solution:** Add a `/health` endpoint on the Keystone Express app that checks:
- PostgreSQL connection (Keystone already does this)
- Redis connection (ping)
- Telegram bot polling status (if enabled)
- MAX bot webhook status (if enabled)
- Token refresher last run time

Returns 200 if all healthy, 503 if any are down. Use for Docker healthcheck and load balancer probes.

**Implementation:** Add `app.get('/health', ...)` in `keystone.ts` `extendExpressApp`. Each transport registers a health check function. ~40 lines.

**Priority:** Medium. Useful for production monitoring, especially with multiple transports.

---

## F7: Per-transport feature flags

**Problem:** You may want to disable a transport temporarily without removing its env var (e.g., MAX bot is under moderation, disable it temporarily).

**Solution:** Add `ENABLE_TELEGRAM` and `ENABLE_MAX` boolean env vars. In `keystone.ts`, check both the token presence AND the enable flag before starting a transport.

**Implementation:**

```typescript
// config.ts
telegramEnabled: optional('ENABLE_TELEGRAM') !== 'false',
maxEnabled: optional('ENABLE_MAX') !== 'false',

// keystone.ts
if (config.telegramBotToken && config.telegramEnabled) { ... }
if (config.maxBotToken && config.maxEnabled) { ... }
```

~10 lines. Defaults to enabled if the flag is not set.

**Priority:** Low. The token-presence check already serves as a basic flag. Add explicit flags if you need to disable a transport without removing env vars (e.g., in a shared .env file).

---

## F8: Metrics and observability

**Problem:** No visibility into bot health, request latency, error rates, or diary API response times across transports.

**Solution:** Add Prometheus-compatible metrics:
- Request count per transport
- Diary API latency histogram
- Token refresh success/failure count
- Active user count per transport
- Error count by type

**Implementation:** Use `prom-client` (npm package). Expose `/metrics` endpoint on the Express app. Add metric instrumentation in `core/fetcher.ts` (latency histogram), `core/tokenRefresher.ts` (refresh counter), and each transport (request counter). ~100 lines total.

**Priority:** Low for a small bot. Medium if the bot grows to thousands of users or if you need SLA monitoring.

---

## F9: Add another transport (VK, WhatsApp, etc.)

**Problem:** A new messenger platform needs to be supported.

**Solution:** This is the payoff of the refactoring. Adding a transport is purely additive:

1. Create `transports/<platform>/` with `bot.ts`, `adapter.ts`, `formatters.ts`
2. Implement `TransportAdapter` interface
3. Map platform events to `DomainEvent`
4. Handle token delivery (platform-specific: deep link, OAuth, mini-app, etc.)
5. Add env vars to `config.ts`
6. Wire in `keystone.ts`

No core files change. No other transports are affected. The diary client, token management, state machine, and handlers are all reused.

**Priority:** Only when there's actual user demand for a new platform.

---

## F10: Push notifications for grade changes

**Problem:** Users must manually check grades. There's no proactive notification when a new grade appears.

**Solution:** A background job polls the diary API for all connected users, compares fetched grades against a cached snapshot, and sends a notification when something new appears.

**Implementation:** Create a `GradeSnapshotRepository` that stores the last seen grades per student per subject. A new job `GradePollerJob` runs every 30 minutes (using the existing `setInterval` pattern or a cron-like scheduler). For each user, it fetches current grades via `fetchFromDnevnik`, hashes the result, and compares with the stored snapshot. On mismatch, it sends a push message via the appropriate transport adapter with details (subject, grade, date).

**Priority:** Medium. Competitive advantage over the official diary app, which has no push notifications. High user value.

---

## F11: Automatic diary token extraction (browser extension)

**Problem:** The biggest friction point is manually extracting tokens from browser dev tools. This is the "couple of squats" mentioned in the README.

**Solution:** Develop a browser extension that detects the diary login and securely transmits tokens to the bot backend.

**Implementation:** A Chrome/Firefox extension injects a content script into `dnevnik.egov66.ru`. After successful login, it intercepts the access/refresh tokens from `localStorage` or network responses. It encrypts them with the bot's public key and sends them via a one-time POST to `/api/extension/connect` along with a user-provided connection code. The bot backend matches the code to the pending user session.

**Priority:** Medium. Massively improves onboarding conversion rate. Eliminates the manual token extraction step entirely.

---

## F12: Federated identity (Gosuslugi OAuth proxy)

**Problem:** Instead of token extraction, build an OAuth proxy service that negotiates with Gosuslugi directly. The user clicks "Connect" in the bot, gets redirected to the proxy, logs into Gosuslugi, and the proxy exchanges the authorization code for diary tokens before sending them to the bot.

**Implementation:** This requires registering as a Gosuslugi OAuth client (ESIA integration), which is legally and technically complex but provides the smoothest UX. The proxy service handles the full OAuth 2.0 + ESIA cryptographic flow (GOST signing, etc.), obtains diary tokens, and redirects back to the bot with an encrypted payload.

**Priority:** Low. Complex legal and technical requirements. Only worth pursuing if the bot grows significantly and the manual token extraction becomes a major adoption barrier.

---

## F13: Fix pre-existing Keystone admin UI build error

**Problem:** `npm run build` exits with code 1 due to `NEXT_EXPORT_ERROR` — a pre-existing Keystone 6 + Next.js admin UI static export failure (`<Html> should not be imported outside of pages/_document`). This affects admin UI pages (`/`, `/signin`, `/messenger-users`, etc.) and prevents `hermes verify` from recording passing evidence.

**Solution:** Investigate and fix the Keystone admin UI's Next.js export configuration. This may involve:
- Upgrading Keystone 6 to a version compatible with the installed Next.js
- Pinning Next.js to a version known to work with Keystone's admin UI
- Configuring Next.js export settings in Keystone's build pipeline

**Implementation:** This is a Keystone/Next.js compatibility issue, not related to the transport layer. It requires investigating the Keystone 6 admin UI build process and Next.js version compatibility matrix.

**Priority:** Medium. Currently blocks `hermes verify` from recording passing evidence. The admin UI works fine in dev mode (`npm run dev`), only the production build's static export step fails.

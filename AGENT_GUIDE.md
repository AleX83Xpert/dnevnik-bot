# Dnevnik-Bot — Agent Guide

This file provides context for AI agents working on this project.
Read this before making any changes.

**IMPORTANT: Keep this file up to date.** When you change the architecture,
add/remove files, change interfaces, or discover new pitfalls, update this
file to reflect the current state. Outdated documentation is worse than none.

## What This Project Is

A multi-transport bot (Telegram + MAX) for the Sverdlovsk Region electronic school diary (dnevnik.egov66.ru). Parents check schedule, homework, and grades without logging into Gosuslugi every time.

## Architecture (Three Layers)

The project uses a three-layer architecture with strict dependency rules:

```
transports/  ──imports──▶  core/  ──imports──▶  domain/ (clients/, schema, config)
```

**CRITICAL RULE: `core/` NEVER imports from `transports/`.** This is the key architectural constraint. If you add an import from `transports/` in any `core/` file, you are breaking the architecture.

### Layer 1: Transport (`transports/`)

Thin platform adapters. Each transport:
- Parses platform-specific updates into `DomainEvent`
- Implements `TransportAdapter` interface for outgoing messages
- Manages platform-specific session storage

Current transports:
- `transports/telegram/` — Telegraf-based, MarkdownV2 formatting
- `transports/max/` — @maxhub/max-bot-api, HTML formatting

### Layer 2: Core (`core/`)

Transport-agnostic business logic. All bot logic lives here:
- `types.ts` — BotContext, BotSession, ConversationState, DomainEvent, TransportAdapter
- `router.ts` — state machine (replaces Telegraf Scenes)
- `handlers.ts` — all scene handlers (onStart, enterSelectStudent, handleScheduleToday, etc.)
- `fetcher.ts` — fetchFromDnevnik with auto token refresh
- `tokenRefresher.ts` — background token refresh with isRefreshing guard
- `userRepo.ts` — user database operations
- `sessionManager.ts` — SessionStore interface + SessionManager class
- `formatters.ts` — data formatting using TransportAdapter.bold()/escape()
- `errors.ts` — NoUserError, NoTokensError, AuthenticationExpiredError, DiaryUnavailableError
- `constants.ts` — ALL_USER_FIELDS, SESSION_TTL_SEC (45 days)

### Layer 3: Domain (unchanged, platform-agnostic)
- `clients/dnevnik/` — DnevnikClient HTTP client for diary API
- `keystone/fields/encryptedText/` — AES-256-CBC field for token encryption
- `schema.ts` — MessengerUser list (platform + platformUserId)
- `config.ts` — single validated config, no process.env elsewhere
- `infrastructure/redisSessionStore.ts` — RedisSessionStore with TTL

## Key Files

| File | Purpose |
|------|---------|
| `keystone.ts` | Entry point. Boots DB, token refresher, and transports |
| `config.ts` | All env vars. No other file should read process.env |
| `core/router.ts` | State machine — dispatches DomainEvents to handlers |
| `core/handlers.ts` | All bot logic (scenes, commands, token handling) |
| `core/fetcher.ts` | Diary API calls with auto token refresh |
| `core/types.ts` | All shared interfaces — start here to understand the architecture |
| `transports/telegram/adapter.ts` | TelegramTransportAdapter — maps core calls to Telegraf |
| `transports/max/adapter.ts` | MaxTransportAdapter — maps core calls to MAX Bot API |

## How to Add a New Transport

1. Create `transports/<platform>/` with `bot.ts`, `adapter.ts`, `formatters.ts`
2. Implement `TransportAdapter` interface (see `core/types.ts`)
3. Map platform events to `DomainEvent`
4. Handle token delivery (platform-specific)
5. Add env vars to `config.ts`
6. Wire in `keystone.ts` — copy the MAX pattern

**Do NOT change any `core/` files.** The whole point is that core is reusable.

## Database

- PostgreSQL via Keystone 6 ORM
- `MessengerUser` table (renamed from `TelegramUser`)
- Encrypted token fields (AES-256-CBC with `TOKENS_ENCRYPTION_KEY`)
- User lookup by `platform` + `platformUserId` (uses `findMany` since Keystone doesn't generate composite unique where input)

## Sessions

- Stored in Redis with 45-day TTL (`SESSION_TTL_SEC` in `core/constants.ts`)
- Keyed by `dnevnik:<platform>:<userId>`
- `messageRef` stored in session for cross-request menu message editing
- Both transports use `RedisSessionStore` from `infrastructure/`

## Token Delivery

- **Telegram**: WebApp `sendData()` → bot receives `web_app_data` event
- **MAX**: Mini-app POSTs to `/api/max/connect-dnevnik` with `initData` for HMAC-SHA256 validation

## Verification

```bash
npm run test      # Jest — 4 suites, 23 tests
npm run build     # Keystone build (TypeScript compiles, but Next.js export has pre-existing error)
npx tsc --noEmit  # TypeScript check (0 source errors expected)
```

**Known issue:** `npm run build` exits with code 1 due to `NEXT_EXPORT_ERROR` — a pre-existing Keystone admin UI + Next.js static export issue. TypeScript compilation passes (`✓ Compiled successfully`). This is NOT caused by transport layer changes. See `TODO.md` F13.

## Common Pitfalls

1. **Don't add `express.json()` globally** — it conflicts with Keystone's body parser. Apply it per-route (see MAX endpoints in `transports/max/bot.ts`).

2. **Telegram MarkdownV2 escaping** — `bold()` in `transports/telegram/formatters.ts` escapes content before wrapping in `*...*`. Plain text messages use `needsMarkdownV2()` auto-detection to avoid escaping non-formatted text.

3. **MAX API quirks**:
   - `answerOnCallback()` is actually `answerOnCallback({ notification: '' })` — requires notification or message
   - `handleUpdate` is private — use `(bot as any).handleUpdate(update)`
   - Inline keyboard attachments use `{ type: 'inline_keyboard', payload: { buttons: [...] } }` (not `keyboard`)
   - `open_app` button: `web_app` is the bot username, `payload` becomes `WebAppStartParam`

4. **messageRef persistence** — stored in `BotSession.messageRef` (in Redis), NOT on the adapter instance. The adapter reads/writes via `session.messageRef`.

5. **Config validation** — `config.ts` throws at startup if required vars are missing. At least one transport token is required.

## Further Reading

- `TODO.md` — future improvements (caching, circuit breaker, rate limiting, etc.)
- `README.md` — project description, setup instructions, and usage

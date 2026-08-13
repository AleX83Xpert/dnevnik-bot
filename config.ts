import 'dotenv/config'

function required (name: string): string {
  const val = process.env[name]
  if (!val || val.length === 0) {
    throw new Error(`Environment variable ${name} is required`)
  }
  return val
}

function optional (name: string): string | undefined {
  return process.env[name] || undefined
}

function requiredNumber (name: string): number {
  const val = Number(required(name))
  if (Number.isNaN(val)) {
    throw new Error(`Environment variable ${name} must be a number`)
  }
  return val
}

export const config = {
  nodeEnv: optional('NODE_ENV') ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  shadowDatabaseUrl: required('SHADOW_DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  sessionSecret: required('SESSION_SECRET'),
  tokensEncryptionKey: required('TOKENS_ENCRYPTION_KEY'),
  loginPageUrl: optional('LOGIN_PAGE_URL'),
  maxLoginPageUrl: optional('MAX_LOGIN_PAGE_URL'),
  telegramBotToken: optional('TELEGRAM_BOT_TOKEN'),
  maxBotToken: optional('MAX_BOT_TOKEN'),
  maxBotUsername: optional('MAX_BOT_USERNAME'),
  refreshIntervalSec: requiredNumber('TELEGRAM_TOKENS_REFRESH_INTERVAL_SEC'),
  refreshBeforeSec: requiredNumber('TELEGRAM_TOKENS_REFRESH_BEFORE_SEC'),
  tokensTtlSec: optional('TELEGRAM_TOKENS_TTL_SEC') ? Number(optional('TELEGRAM_TOKENS_TTL_SEC')) : 600,
  forceAccessTokenTtl: optional('FORCE_ACCESS_TOKEN_TTL') === 'true',
  enableDbLogs: optional('ENABLE_DB_LOGS') === 'true',
} as const

// Validate that at least one transport token is present
if (!config.telegramBotToken && !config.maxBotToken) {
  throw new Error('At least one transport bot token is required (TELEGRAM_BOT_TOKEN or MAX_BOT_TOKEN)')
}

// Validate encryption key length
if (config.tokensEncryptionKey.length !== 32) {
  throw new Error('TOKENS_ENCRYPTION_KEY must be exactly 32 characters')
}

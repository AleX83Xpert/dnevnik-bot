import { config as keystoneConfig } from '@keystone-6/core'
import { config } from './config'
import { lists } from './schema'
import { withAuth, session } from './auth'
import { getLogger } from './utils/logger'
import { startTokenRefresher } from './core/tokenRefresher'
import { prepareTelegramBot } from './transports/telegram/bot'
import { prepareMaxBot, ensureWebhookSubscription } from './transports/max/bot'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import localeData from 'dayjs/plugin/localeData'

dayjs.locale('ru')
dayjs.extend(localeData)

const logger = getLogger('main')

export default withAuth(
  keystoneConfig({
    db: {
      provider: 'postgresql',
      url: config.databaseUrl,
      shadowDatabaseUrl: config.shadowDatabaseUrl,
      onConnect: async (context) => { logger.info({ msg: 'Connected to database' }) },
      enableLogging: config.enableDbLogs,
      idField: { kind: 'uuid' },
    },
    lists,
    session,
    ui: {
      basePath: '/admin',
      isAccessAllowed({ session }) {
        return session?.data.isAdmin === true
      },
    },
    server: {
      extendExpressApp: async (app, context) => {
        // Disable GraphQL multipart upload middleware when not using file uploads
        // This prevents potential conflicts with request parsing and reduces overhead
        app.disable('graphqlUploadMiddleware')

        const godContext = context.sudo()

        startTokenRefresher(godContext, config.refreshIntervalSec, config.refreshBeforeSec)

        if (config.telegramBotToken) {
          const bot = await prepareTelegramBot(godContext, config.telegramBotToken)
          bot.launch()

          // Enable graceful stop
          process.once('SIGINT', () => bot.stop('SIGINT'))
          process.once('SIGTERM', () => bot.stop('SIGTERM'))
          logger.info({ msg: 'Telegram bot started' })
        }

        if (config.maxBotToken) {
          const maxBot = await prepareMaxBot(godContext, app)

          if (config.maxBotWebhookUrl && config.maxBotWebhookSecret) {
            // Production: use webhooks
            await ensureWebhookSubscription(
              config.maxBotToken,
              config.maxBotWebhookUrl,
              config.maxBotWebhookSecret,
            )
            logger.info({ msg: 'MAX bot started with webhook', url: config.maxBotWebhookUrl })
          } else {
            // Development: use long polling
            maxBot.start()
            logger.info({ msg: 'MAX bot started with long polling' })
          }
        }
      },
    }
  })
)

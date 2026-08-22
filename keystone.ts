import { config as keystoneConfig } from '@keystone-6/core'
import { config } from './config'
import { lists } from './schema'
import { withAuth, session } from './auth'
import { getLogger } from './utils/logger'
import { startTokenRefresher } from './core/tokenRefresher'
import { prepareTelegramBot } from './transports/telegram/bot'
import { prepareMaxBot, ensureWebhookSubscription } from './transports/max/bot'
import { randomBytes } from 'node:crypto'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import localeData from 'dayjs/plugin/localeData'
import { PrismaPg } from '@prisma/adapter-pg'

dayjs.locale('ru')
dayjs.extend(localeData)

const logger = getLogger('main')

export default withAuth(
  keystoneConfig({
    db: {
      provider: 'postgresql',
      url: config.databaseUrl,
      shadowDatabaseUrl: config.shadowDatabaseUrl,
      prismaClientOptions: () => ({
        adapter: new PrismaPg({ connectionString: config.databaseUrl }),
      }),
      onConnect: async (context) => {
        logger.info({ msg: 'Connected to database' })
        // Seed development data if no users exist
        const sudo = context.sudo()
        const userCount = await sudo.db.User.count()
        if (userCount === 0) {
          logger.info({ msg: 'No users found, creating development user' })
          // Create a development-only account with a random password
          const password = randomBytes(16).toString('hex')
          await sudo.db.User.create({
            data: {
              name: 'Development Admin',
              email: 'admin@example.com',
              password,
              isAdmin: true,
            },
          })
          logger.info({ msg: 'Development user created', email: 'admin@example.com', password })
        }
      },
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
            try {
              await ensureWebhookSubscription(
                config.maxBotToken,
                config.maxBotWebhookUrl,
                config.maxBotWebhookSecret,
              )
              logger.info({ msg: 'MAX bot started with webhook', url: config.maxBotWebhookUrl })
            } catch (err) {
              logger.error({ msg: 'Failed to setup MAX webhook subscription', err })
            }
          } else {
            // Development: use long polling
            maxBot.start()
            logger.info({ msg: 'MAX bot started with long polling' })
          }
        }
      },
    },
  })
)

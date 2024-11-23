import 'dotenv/config'
import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'
import { getLogger } from './utils/logger'
import { startTokensRefresher } from './utils/dnevnikTokensRefresher'
import { prepareTelegramBot } from './telegramBot/bot'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import localeData from 'dayjs/plugin/localeData'

dayjs.locale('ru')
dayjs.extend(localeData)

const logger = getLogger('main')

export default withAuth(
  config({
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL as string,
      shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL as string,
      onConnect: async (context) => { logger.info({ msg: 'Connected to database' }) },
      enableLogging: process.env.ENABLE_DB_LOGS === 'true',
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
        const godContext = context.sudo()

        if (!process.env.TELEGRAM_TOKENS_REFRESH_INTERVAL_SEC) {
          throw new Error('TELEGRAM_TOKENS_REFRESH_INTERVAL_SEC must be provided!')
        }

        if (!process.env.TELEGRAM_TOKENS_REFRESH_BEFORE_SEC) {
          throw new Error('TELEGRAM_TOKENS_REFRESH_BEFORE_SEC must be provided!')
        }

        startTokensRefresher(godContext, Number(process.env.TELEGRAM_TOKENS_REFRESH_INTERVAL_SEC), Number(process.env.TELEGRAM_TOKENS_REFRESH_BEFORE_SEC))

        if (!process.env.TELEGRAM_BOT_TOKEN) {
          throw new Error('TELEGRAM_BOT_TOKEN must be provided!')
        }
        
        const bot = prepareTelegramBot(godContext, process.env.TELEGRAM_BOT_TOKEN as string)
        bot.launch()

        // Enable graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'))
        process.once('SIGTERM', () => bot.stop('SIGTERM'))
      },
    }
  })
)

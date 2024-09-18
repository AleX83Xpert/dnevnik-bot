import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'
import { getLogger } from './utils/logger'
import { Markup, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import 'dotenv/config'

const logger = getLogger('main')

export default withAuth(
  config({
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL as string,
      shadowDatabaseUrl: 'postgres://postgres:postgres@localhost:5432/mainshadowdb', // TODO move to env?
      onConnect: async (context) => { logger.info({ msg: 'Connected to database' }) },
      enableLogging: true,
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
        app.get('/loginPage', (req, res, next) => {
          res.send('<h1>hello</h1>')
        })

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN as string, {})

        bot.start((ctx) => {
          ctx.reply('Здравствуйте! Это бот для работы с дневником. Он подключается к дневнику используя ваш аккаунт. Чтобы указать данные аккаунта, используйте команду /login.')
        })

        bot.on(message('web_app_data'), (ctx) => {
          const data = ctx.webAppData?.data.json()
          // TODO update and save tokens
          ctx.reply('Готово! Бот подключен к вашему аккаунту в дневнике. Чтобы отключить все это используйте команду /logout.', Markup.removeKeyboard())
        })

        bot.command('login', (ctx) => {
          // TODO check for already has dnevnik tokens
          ctx.reply(
            'Для подключения дневника нажмите кнопку "Подключить дневник" внизу. Там же откроется инструкция.',
            Markup.keyboard([Markup.button.webApp('Подключить дневник', 'https://feathers.studio/telegraf/webapp/example')]).resize(),
          )
        })

        bot.command('logout', (ctx) => {
          ctx.reply('Good bye :\'(', Markup.removeKeyboard())
        })

        bot.launch()
        process.once('SIGINT', () => bot.stop('SIGINT'))
        process.once('SIGTERM', () => bot.stop('SIGTERM'))
      },
    }
  })
)

import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'
import { getLogger } from './utils/logger'
import { Markup, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import express from 'express'
import 'dotenv/config'
import { DnevnikClient } from './clients/DnevnikClient'

const logger = getLogger('main')

type TDnevnikTokens = {
  accessToken: string
  refreshToken: string
}

export default withAuth(
  config({
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL as string,
      shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL as string,
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
        const godContext = context.sudo()
        const loginPageUrl = `${process.env.SERVER_URL}/static/loginPage.html`

        app.use('/static/', express.static('./public'))

        setInterval(async () => {
          logger.info({ msg: 'refresh tokens' })
        }, 300000)

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN as string, {})

        bot.start(async (ctx) => {
          const telegramId = String(ctx.from.id)
          let telegramUser = await godContext.db.TelegramUser.findOne({ where: { telegramId } })
          if (!telegramUser) {
            telegramUser = await godContext.db.TelegramUser.createOne({
              data: {
                telegramId,
                meta: ctx.from,
              }
            })
          }

          ctx.reply(`Здравствуйте, ${ctx.from.first_name ?? ctx.from.username ?? 'человек'}! Это бот для работы с дневником. Он подключается к дневнику, используя ваш аккаунт. Чтобы указать данные аккаунта, используйте команду /login.`)
        })

        bot.on(message('web_app_data'), async (ctx) => {
          const data: TDnevnikTokens = ctx.webAppData?.data.json()
          const telegramId = String(ctx.from.id)

          logger.info({ msg: 'check tokens', data })

          let telegramUser = await godContext.db.TelegramUser.findOne({ where: { telegramId } })
          if (!telegramUser) {
            telegramUser = await godContext.db.TelegramUser.createOne({
              data: {
                telegramId,
                meta: ctx.from,
              }
            })
          }

          // get new tokens data
          const dnevnikClient = new DnevnikClient({ accessToken: data.accessToken, refreshToken: data.refreshToken })
          const newTokens = await dnevnikClient.refreshTokens()
          await godContext.db.TelegramUser.updateOne({
            where: { telegramId },
            data: {
              dnevnikAccessToken: newTokens.accessToken,
              dnevnikAccessTokenExpirationDate: newTokens.accessTokenExpirationDate,
              dnevnikRefreshToken: newTokens.refreshToken,
            }
          })

          // TODO update and save tokens
          ctx.reply('Готово! Бот подключен к вашему аккаунту в дневнике. Чтобы отключить все это используйте команду /logout.', Markup.removeKeyboard())
        })

        bot.command('login', (ctx) => {
          // TODO check for already has dnevnik tokens
          ctx.reply(
            'Для подключения дневника нажмите кнопку "Подключить дневник" внизу. Там же откроется инструкция.',
            Markup.keyboard([Markup.button.webApp('Подключить дневник', loginPageUrl)]).resize(),
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

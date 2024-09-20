import { KeystoneContext } from "@keystone-6/core/types"
import { Markup, Telegraf } from "telegraf"
import { getLogger } from '../utils/logger'
import { message } from 'telegraf/filters'
import { DnevnikClient } from "../clients/DnevnikClient"
import { TDnevnikTokens } from "./types"
import dayjs from "dayjs"

async function findOrCreateTelegramUser(godContext: KeystoneContext, telegramId: string, meta: unknown) {
  let telegramUser = await godContext.db.TelegramUser.findOne({ where: { telegramId } })
  if (!telegramUser) {
    telegramUser = await godContext.db.TelegramUser.createOne({
      data: {
        telegramId,
        meta,
      }
    })
  }

  return telegramUser
}

export function prepareTelegramBot(godContext: KeystoneContext, botToken: string): Telegraf {
  const loginPageUrl = `${process.env.SERVER_URL}/static/loginPage.html`
  const logger = getLogger('telegramBot')
  const bot = new Telegraf(botToken)

  bot.start(async (ctx) => {
    const telegramId = String(ctx.from.id)
    
    await findOrCreateTelegramUser(godContext, telegramId, ctx.from)

    ctx.reply(`Здравствуйте, ${ctx.from.first_name ?? ctx.from.username ?? 'человек'}! Это бот для работы с дневником. Он подключается к дневнику, используя ваш аккаунт. Чтобы указать данные аккаунта, используйте команду /login.`)
  })

  bot.on(message('web_app_data'), async (ctx) => {
    const data = ctx.webAppData?.data.json() as TDnevnikTokens
    const telegramId = String(ctx.from.id)

    logger.info({ msg: 'check tokens', data })

    await findOrCreateTelegramUser(godContext, telegramId, ctx.from)

    // get new tokens data
    const dnevnikClient = new DnevnikClient({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    const newTokens = await dnevnikClient.refreshTokens()
    await godContext.db.TelegramUser.updateOne({
      where: { telegramId },
      data: {
        dnevnikAccessToken: newTokens.accessToken,
        dnevnikAccessTokenExpirationDate: newTokens.accessTokenExpirationDate,
        dnevnikRefreshToken: newTokens.refreshToken,
        dnevnikTokensUpdatedAt: dayjs().toISOString(),
      }
    })

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

  return bot
}

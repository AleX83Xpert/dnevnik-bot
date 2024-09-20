import { KeystoneContext } from "@keystone-6/core/types"
import { Markup, Telegraf } from "telegraf"
import { getLogger } from '../utils/logger'
import { message } from 'telegraf/filters'
import { onLogout, onSendTokens, onStart } from "./botHandlers"

export function prepareTelegramBot(godContext: KeystoneContext, botToken: string): Telegraf {
  const loginPageUrl = `${process.env.SERVER_URL}/static/loginPage.html`
  const logger = getLogger('telegramBot')
  const bot = new Telegraf(botToken, {
    handlerTimeout: 30_000,
  })

  bot.start(async (ctx) => {
    await onStart(godContext, ctx)
  })

  bot.on(message('web_app_data'), async (ctx) => {
    await onSendTokens(godContext, ctx)
  })

  bot.command('login', (ctx) => {
    // TODO check for already has actual dnevnik tokens
    ctx.reply(
      'Для подключения дневника нажмите кнопку "Подключить дневник" внизу. Там же откроется инструкция.',
      Markup.keyboard([Markup.button.webApp('Подключить дневник', loginPageUrl)]).resize(),
    )
  })

  bot.command('logout', async (ctx) => {
    await onLogout(godContext, ctx)
  })

  return bot
}

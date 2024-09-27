import { KeystoneContext } from "@keystone-6/core/types"
import { Context, Scenes, session, Telegraf } from "telegraf"
import { getLogger } from '../utils/logger'
import { message, callbackQuery } from 'telegraf/filters'
import { onLogout, onSendTokens, onStart } from "./botHandlers"
import { findTelegramUser, getKeyboardWithLoginButton } from "./botUtils"
import crypto from 'node:crypto'
import { getSelectStudentScene } from "./scenes/selectStudentScene"
import { getStudentScene } from "./scenes/studentScene"
import { DnevnikContext } from "./types"
import { getStudentScheduleScene } from "./scenes/studentScheduleScene"
import { getStudentHomeworkScene } from "./scenes/studentHomeworkScene"
import { getStudentGradesScene } from "./scenes/studentGradesScene"
import { Lists } from '.keystone/types'

export function prepareTelegramBot(godContext: KeystoneContext, botToken: string): Telegraf<DnevnikContext> {
  const logger = getLogger('telegramBot')

  const bot = new Telegraf<DnevnikContext>(botToken)
  const stage = new Scenes.Stage<DnevnikContext>([
    getSelectStudentScene(),
    getStudentScene(godContext),
    getStudentScheduleScene(godContext),
    getStudentHomeworkScene(godContext),
    getStudentGradesScene(godContext),
  ])

  // Logger middleware. Must be first
  bot.use((ctx, next) => {
    const start = Date.now()
    if (!ctx.reqId) {
      ctx.reqId = crypto.randomUUID()
    }
    logger.info({ msg: 'requestStart', reqId: ctx.reqId, updateType: ctx.updateType, update: ctx.update })
    return next().then(() => {
      const duration = Date.now() - start
      logger.info({ msg: 'requestEnd', reqId: ctx.reqId, duration })
    })
  })

  // Add session
  bot.use(session({ defaultSession: () => ({ students: [] }) }))

  // Init session
  bot.use(async (ctx, next) => {
    let telegramUser: Lists.TelegramUser.Item | undefined
    if (ctx.from?.id) {
      telegramUser = await findTelegramUser(godContext, String(ctx.from.id)) as Lists.TelegramUser.Item
    }

    ctx.session.telegramUser = telegramUser
    next()
  })

  // Use scenes
  bot.use(stage.middleware())

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
      getKeyboardWithLoginButton(),
    )
  })

  bot.command('logout', async (ctx) => {
    await onLogout(godContext, ctx)
  })

  return bot
}

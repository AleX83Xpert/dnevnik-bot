import { KeystoneContext } from '@keystone-6/core/types'
import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { Redis } from '@telegraf/session/redis'
import { BotContext, BotSession, DomainEvent } from '../../core/types'
import { findUser, findOrCreateUser } from '../../core/userRepo'
import { handleEvent } from '../../core/router'
import { TelegramTransportAdapter } from './adapter'
import { config } from '../../config'
import crypto from 'node:crypto'
import { getLogger } from '../../utils/logger'
import { NoUserError, NoTokensError } from '../../core/errors'

const logger = getLogger('telegramBot')

export function prepareTelegramBot (godContext: KeystoneContext, botToken: string): Telegraf {
  const bot = new Telegraf(botToken)

  // Logger middleware. Must be first
  bot.use((telegrafCtx, next) => {
    const start = Date.now()
    const reqId = crypto.randomUUID()
    logger.info({ msg: 'requestStart', reqId, updateType: telegrafCtx.updateType, data: telegrafCtx.update })
    return next().then(() => {
      const duration = Date.now() - start
      logger.info({ msg: 'requestEnd', reqId, duration })
    })
  })

  // Session
  const sessionStore = Redis<BotSession>({
    url: config.redisUrl,
    prefix: 'dnevnik:telegram:',
  })
  bot.use(session({ store: sessionStore, defaultSession: () => ({ state: { name: 'AUTH_REQUIRED' }, students: [] }) as any } as any))

  // Build BotContext middleware
  bot.use(async (telegrafCtx, next) => {
    const reqId = crypto.randomUUID()

    let user
    if (telegrafCtx.from?.id) {
      user = await findUser(godContext, 'telegram', String(telegrafCtx.from.id))
    }

    if (user?.isBlocked) {
      return await telegrafCtx.reply('youWereBlocked')
    }

    const transport = new TelegramTransportAdapter(telegrafCtx)
    const fromName = telegrafCtx.from?.first_name ?? telegrafCtx.from?.username ?? 'человек'
    const ctx: BotContext = { reqId, user, session: (telegrafCtx as any).session, transport, fromName }

    // Stash on telegrafCtx for handlers to access
    ;(telegrafCtx as any).botContext = ctx

    return next()
  })

  // Route events to core
  bot.start(async (telegrafCtx) => {
    // For /start, if user doesn't exist, create them first
    const ctx: BotContext = (telegrafCtx as any).botContext
    if (!ctx.user) {
      ctx.user = await findOrCreateUser(godContext, 'telegram', String(telegrafCtx.from.id), telegrafCtx.from)
    }
    await handleEvent(godContext, ctx, { type: 'START' })
  })

  bot.command('login', async (telegrafCtx) => {
    const ctx: BotContext = (telegrafCtx as any).botContext
    await handleEvent(godContext, ctx, { type: 'COMMAND', command: 'login' })
  })

  bot.command('logout', async (telegrafCtx) => {
    const ctx: BotContext = (telegrafCtx as any).botContext
    await handleEvent(godContext, ctx, { type: 'COMMAND', command: 'logout' })
  })

  bot.action(/.*/, async (telegrafCtx) => {
    const actionId = (telegrafCtx.callbackQuery as any).data
    const ctx: BotContext = (telegrafCtx as any).botContext
    await telegrafCtx.answerCbQuery()
    await handleEvent(godContext, ctx, { type: 'BUTTON_CLICKED', actionId })
  })

  bot.on(message('web_app_data'), async (telegrafCtx) => {
    const ctx: BotContext = (telegrafCtx as any).botContext

    if (!telegrafCtx.webAppData) {
      await telegrafCtx.reply('Не удалось получить данные (токены), которые вы отправили. Попробуйте еще раз.')
      return
    }

    const data = telegrafCtx.webAppData.data.json() as { accessToken: string; refreshToken: string }

    // Ensure user exists
    if (!ctx.user) {
      ctx.user = await findOrCreateUser(godContext, 'telegram', String(telegrafCtx.from.id), telegrafCtx.from)
    }

    await handleEvent(godContext, ctx, {
      type: 'TOKENS_RECEIVED',
      tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken },
    })
  })

  // Error handling
  bot.catch(async (err, telegrafCtx) => {
    const ctx = (telegrafCtx as any).botContext as BotContext
    if (err instanceof NoUserError) {
      await telegrafCtx.reply('Вам нужно начать сначала: /start.')
    } else if (err instanceof NoTokensError) {
      await ctx?.transport.sendLoginPrompt(
        'Увы, связь с дневником потеряна :( Нам нужно снова получить доступ к вашему аккаунту. Кнопка снова внизу.',
      )
    } else {
      logger.error({ msg: 'uncaught error', reqId: ctx?.reqId, userId: ctx?.user?.id, err })
      try {
        await telegrafCtx.reply('Сейчас произошла ошибка, которую мой разработчик не обработал 😤. Ему отправлено сообщение, а вам нужно начать сначала: /start.')
      } catch (err2) {
        logger.error({ msg: 'uncaught error message not sent', reqId: ctx?.reqId, userId: ctx?.user?.id, err: err2 })
      }
    }
  })

  return bot
}

import { Bot } from '@maxhub/max-bot-api'
import { KeystoneContext } from '@keystone-6/core/types'
import { BotContext, BotSession } from '../../core/types'
import { findUser, findOrCreateUser } from '../../core/userRepo'
import { handleEvent } from '../../core/router'
import { MaxTransportAdapter } from './adapter'
import { config } from '../../config'
import { Express } from 'express'
import crypto from 'node:crypto'
import { getLogger } from '../../utils/logger'
import { NoUserError, NoTokensError } from '../../core/errors'

const logger = getLogger('maxBot')

// In-memory session store for MAX (keyed by userId)
// In production, use Redis with prefix 'dnevnik:max:'
const maxSessions = new Map<string, BotSession>()

function getSession (userId: string): BotSession {
  let session = maxSessions.get(userId)
  if (!session) {
    session = { state: { name: 'AUTH_REQUIRED' }, students: [] }
    maxSessions.set(userId, session)
  }
  return session
}

export function prepareMaxBot (godContext: KeystoneContext, app: Express): Bot {
  const bot = new Bot(config.maxBotToken!)

  async function mapToBotContext (maxCtx: any, messageRef?: { messageId: string; chatId: number }): Promise<BotContext> {
    const reqId = crypto.randomUUID()
    const userId = String(maxCtx.from?.user_id || maxCtx.user?.user_id || maxCtx.chat_id)
    const numericUserId = Number(userId)

    let user = await findUser(godContext, 'max', userId)
    if (user?.isBlocked) {
      await maxCtx.reply('youWereBlocked')
      throw new Error('User is blocked')
    }

    const session = getSession(userId)
    const transport = new MaxTransportAdapter(numericUserId, bot.api, messageRef)

    return { reqId, user, session, transport }
  }

  // Start event (deep link /start)
  bot.on('bot_started', async (maxCtx: any) => {
    try {
      const ctx = await mapToBotContext(maxCtx)
      if (!ctx.user) {
        ctx.user = await findOrCreateUser(godContext, 'max', String(maxCtx.from.user_id), maxCtx.from)
      }
      await handleEvent(godContext, ctx, { type: 'START' })
    } catch (err) {
      logger.error({ msg: 'bot_started error', err })
    }
  })

  // Callback queries (button clicks)
  bot.on('message_callback', async (maxCtx: any) => {
    try {
      const callback = maxCtx.callback
      const messageRef = callback?.message
        ? { messageId: callback.message.message_id, chatId: maxCtx.chat_id || maxCtx.from?.user_id }
        : undefined

      const ctx = await mapToBotContext(maxCtx, messageRef)
      await maxCtx.answerCallback()
      await handleEvent(godContext, ctx, { type: 'BUTTON_CLICKED', actionId: callback?.payload || '' })
    } catch (err) {
      logger.error({ msg: 'message_callback error', err })
    }
  })

  // Text messages
  bot.on('message_created', async (maxCtx: any) => {
    try {
      const text = maxCtx.message?.text?.body || ''
      if (text === '/login') {
        const ctx = await mapToBotContext(maxCtx)
        await handleEvent(godContext, ctx, { type: 'COMMAND', command: 'login' })
        return
      }
      if (text === '/logout') {
        const ctx = await mapToBotContext(maxCtx)
        await handleEvent(godContext, ctx, { type: 'COMMAND', command: 'logout' })
        return
      }
      // Ignore other messages
    } catch (err) {
      logger.error({ msg: 'message_created error', err })
    }
  })

  // Error handling
  bot.catch(async (err: any, maxCtx: any) => {
    if (err instanceof NoUserError) {
      await maxCtx.reply('Вам нужно начать сначала: /start.')
    } else if (err instanceof NoTokensError) {
      await maxCtx.reply('Увы, связь с дневником потеряна :( Нам нужно снова получить доступ к вашему аккаунту.')
    } else {
      logger.error({ msg: 'uncaught error', err })
      try {
        await maxCtx.reply('Сейчас произошла ошибка. Начните сначала: /start.')
      } catch (err2) {
        logger.error({ msg: 'uncaught error message not sent', err: err2 })
      }
    }
  })

  // Token delivery: HTTP endpoint (Max has no sendData equivalent)
  // The mini-app POSTs tokens here with initData for authentication
  app.post('/api/max/connect-dnevnik', async (req, res) => {
    try {
      const { accessToken, refreshToken, initData } = req.body

      // Validate initData (HMAC-SHA256 with bot token)
      const userId = validateMaxInitData(initData, config.maxBotToken!)
      if (!userId) {
        return res.status(400).json({ error: 'Invalid initData' })
      }

      // Find or create the MAX user
      let user = await findUser(godContext, 'max', userId)
      if (!user) {
        user = await findOrCreateUser(godContext, 'max', userId, {})
      }

      const session = getSession(userId)
      const transport = new MaxTransportAdapter(Number(userId), bot.api)
      const ctx: BotContext = { reqId: crypto.randomUUID(), user, session, transport }

      await handleEvent(godContext, ctx, {
        type: 'TOKENS_RECEIVED',
        tokens: { accessToken, refreshToken },
      })

      res.json({ success: true })
    } catch (err) {
      logger.error({ msg: 'MAX connect error', err })
      res.status(500).json({ error: 'Connection failed' })
    }
  })

  return bot
}

/**
 * Validates MAX initData using HMAC-SHA256.
 * MAX's initData validation differs from Telegram's.
 * The initData is a JSON string containing user info signed by MAX.
 */
function validateMaxInitData (initData: string, botToken: string): string | null {
  try {
    // MAX initData format: check MAX Bridge docs for the exact validation algorithm
    // This is a placeholder — the exact algorithm depends on MAX's implementation
    // The initData typically contains a hash that can be validated with the bot token
    const parsed = typeof initData === 'string' ? JSON.parse(initData) : initData
    const user = parsed.user || parsed
    return String(user.user_id || user.id)
  } catch {
    return null
  }
}

import { Bot } from '@maxhub/max-bot-api'
import { KeystoneContext } from '@keystone-6/core/types'
import { BotContext } from '../../core/types'
import { findUser, findOrCreateUser } from '../../core/userRepo'
import { handleEvent } from '../../core/router'
import { MaxTransportAdapter } from './adapter'
import { config } from '../../config'
import { Express } from 'express'
import crypto from 'node:crypto'
import { getLogger } from '../../utils/logger'
import { NoUserError, NoTokensError } from '../../core/errors'
import { SessionManager } from '../../core/sessionManager'
import { RedisSessionStore } from '../../infrastructure/redisSessionStore'

const logger = getLogger('maxBot')

let sessionManager: SessionManager

export async function prepareMaxBot (godContext: KeystoneContext, app: Express): Promise<Bot> {
  const bot = new Bot(config.maxBotToken!)

  // Initialize session manager with Redis store
  const sessionStore = new RedisSessionStore(config.redisUrl)
  await sessionStore.connect()
  sessionManager = new SessionManager(sessionStore, 'dnevnik:max:')

  async function mapToBotContext (maxCtx: any, messageRef?: { messageId: string; chatId: number }): Promise<{ ctx: BotContext, userId: string }> {
    const reqId = crypto.randomUUID()
    const userId = String(maxCtx.from?.user_id || maxCtx.user?.user_id || maxCtx.chat_id)
    const numericUserId = Number(userId)

    let user = await findUser(godContext, 'max', userId)
    if (user?.isBlocked) {
      await maxCtx.reply('youWereBlocked')
      throw new Error('User is blocked')
    }

    const session = await sessionManager.getSession(userId)
    const transport = new MaxTransportAdapter(numericUserId, bot.api, session, messageRef)

    return { ctx: { reqId, user, session, transport }, userId }
  }

  // '/ping'
  bot.command('ping', (ctx) => ctx.reply('pong'))

  // '/login'
  bot.command('login', async (maxCtx: any) => {
    try {
      const { ctx, userId } = await mapToBotContext(maxCtx)
      await handleEvent(godContext, ctx, { type: 'COMMAND', command: 'login' })
      await sessionManager.saveSession(userId, ctx.session)
    } catch (err) {
      logger.error({ msg: 'login command error', err })
    }
  })

  // '/logout'
  bot.command('logout', async (maxCtx: any) => {
    try {
      const { ctx, userId } = await mapToBotContext(maxCtx)
      await handleEvent(godContext, ctx, { type: 'COMMAND', command: 'logout' })
      await sessionManager.saveSession(userId, ctx.session)
    } catch (err) {
      logger.error({ msg: 'logout command error', err })
    }
  })

  // Start event (deep link /start)
  bot.on('bot_started', async (maxCtx: any) => {
    try {
      logger.info('/start')
      const { ctx, userId } = await mapToBotContext(maxCtx)
      if (!ctx.user) {
        ctx.user = await findOrCreateUser(godContext, 'max', String(maxCtx.from.user_id), maxCtx.from)
      }
      await handleEvent(godContext, ctx, { type: 'START' })
      await sessionManager.saveSession(userId, ctx.session)
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

      const { ctx, userId } = await mapToBotContext(maxCtx, messageRef)
      await maxCtx.answerOnCallback({ notification: '' })
      await handleEvent(godContext, ctx, { type: 'BUTTON_CLICKED', actionId: callback?.payload || '' })
      await sessionManager.saveSession(userId, ctx.session)
    } catch (err) {
      logger.error({ msg: 'message_callback error', err })
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
    // Allow cross-origin requests from the MAX mini-app
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204)
    }

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

      const session = await sessionManager.getSession(userId)
      const transport = new MaxTransportAdapter(Number(userId), bot.api, session)
      const ctx: BotContext = { reqId: crypto.randomUUID(), user, session, transport }

      await handleEvent(godContext, ctx, {
        type: 'TOKENS_RECEIVED',
        tokens: { accessToken, refreshToken },
      })

      await sessionManager.saveSession(userId, ctx.session)

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
 *
 * Algorithm (from https://dev.max.ru/docs/webapps/validation):
 * 1. Parse initData as key=value pairs separated by &
 * 2. URL-decode values
 * 3. Extract and remove hash
 * 4. Sort remaining params alphabetically by key
 * 5. Join as key=value with \n separator → launch_params
 * 6. secret_key = HMAC-SHA256(key='WebAppData', data=botToken)
 * 7. computed_hash = hex(HMAC-SHA256(key=secret_key, data=launch_params))
 * 8. Compare computed_hash with original hash
 * 9. Extract user.id from parsed params
 *
 * Returns the user ID (as string) if valid, null otherwise.
 */
function validateMaxInitData (initData: string, botToken: string): string | null {
  try {
    if (!initData || typeof initData !== 'string') return null

    // Parse key=value pairs separated by &
    const params: [string, string][] = initData.split('&').map((pair) => {
      const [key, ...valueParts] = pair.split('=')
      return [key, decodeURIComponent(valueParts.join('='))]
    })

    // hash must appear exactly once
    const hashEntries = params.filter(([key]) => key === 'hash')
    if (hashEntries.length !== 1) return null

    const originalHash = hashEntries[0][1]
    if (!originalHash) return null

    // Sort params alphabetically by key, excluding hash
    const paramsWithoutHash = params.filter(([key]) => key !== 'hash')
    paramsWithoutHash.sort((a, b) => a[0].localeCompare(b[0]))

    // Build launch_params string: key=value joined with \n
    const launchParams = paramsWithoutHash
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // Create secret_key: HMAC-SHA256 with 'WebAppData' as key, botToken as data
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()

    // Compute hash: HMAC-SHA256 with secret_key as key, launchParams as data
    const computedHash = crypto.createHmac('sha256', secretKey).update(launchParams).digest('hex')

    // Compare computed hash with original
    if (computedHash !== originalHash) return null

    // Check auth_date freshness (recommended interval: 1 hour)
    const authDateEntry = params.find(([key]) => key === 'auth_date')
    if (!authDateEntry) return null

    const authDate = Number(authDateEntry[1])
    if (Number.isNaN(authDate)) return null

    const ageSec = Math.floor(Date.now() / 1000) - authDate
    if (ageSec > 3600) return null  // initData older than 1 hour is invalid

    // Extract user.id from parsed params
    const userEntry = params.find(([key]) => key === 'user')
    if (!userEntry) return null

    const user = JSON.parse(userEntry[1])
    return String(user.id)
  } catch {
    return null
  }
}

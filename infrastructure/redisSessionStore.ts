import { createClient, RedisClientType } from 'redis'
import { SessionStore } from '../core/sessionManager'
import { BotSession } from '../core/types'
import { SESSION_TTL_SEC } from '../core/constants'
import { getLogger } from '../utils/logger'

const logger = getLogger('redisSessionStore')

export class RedisSessionStore implements SessionStore {
  private client: RedisClientType

  constructor (url: string) {
    this.client = createClient({ url }) as RedisClientType
    this.client.on('error', (err) => logger.error({ msg: 'redis error', err }))
  }

  async connect (): Promise<void> {
    await this.client.connect()
  }

  async get (key: string): Promise<BotSession | undefined> {
    const data = await this.client.get(key)
    return data ? JSON.parse(data) as BotSession : undefined
  }

  async set (key: string, session: BotSession): Promise<void> {
    await this.client.setEx(key, SESSION_TTL_SEC, JSON.stringify(session))
  }

  async delete (key: string): Promise<void> {
    await this.client.del(key)
  }
}

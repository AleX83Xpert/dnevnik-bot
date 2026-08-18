import { BotSession } from './types'

// ─── Session storage interface (storage-agnostic) ───
export interface SessionStore {
  get(key: string): Promise<BotSession | undefined>
  set(key: string, session: BotSession): Promise<void>
  delete(key: string): Promise<void>
}

// ─── Session manager (handles load/save with default session creation) ───
export class SessionManager {
  constructor (private store: SessionStore, private prefix: string) {}

  private key (userId: string): string {
    return `${this.prefix}${userId}`
  }

  async getSession (userId: string): Promise<BotSession> {
    const session = await this.store.get(this.key(userId))
    if (session) return session
    const newSession: BotSession = { state: { name: 'AUTH_REQUIRED' }, students: [] }
    await this.store.set(this.key(userId), newSession)
    return newSession
  }

  async saveSession (userId: string, session: BotSession): Promise<void> {
    await this.store.set(this.key(userId), session)
  }

  async deleteSession (userId: string): Promise<void> {
    await this.store.delete(this.key(userId))
  }
}

import { Context, Scenes } from "telegraf"
import { TStudent } from "../clients/dnevnik/DnevnikClientTypes"
import { Lists } from '.keystone/types'

export type TDnevnikTokens = {
  accessToken: string
  refreshToken: string
}

// Session stores data between requests
export interface DnevnikSession extends Scenes.SceneSession {
  students: TStudent[]
  selectedStudentId?: string
}

// Context is new on every request
export interface DnevnikContext extends Context {
  reqId: string
  telegramUser?: Lists.TelegramUser.Item
  session: DnevnikSession
  scene: Scenes.SceneContextScene<DnevnikContext>
}

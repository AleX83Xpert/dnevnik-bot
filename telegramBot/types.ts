import { Context, Scenes } from "telegraf"
import { TStudent } from "../clients/DnevnikClientTypes"
import { Lists } from '.keystone/types'

export type TDnevnikTokens = {
  accessToken: string
  refreshToken: string
}

// Session stores data between requests
interface DnevnikSession extends Scenes.SceneSession {
  telegramUser?: Lists.TelegramUser.Item
  students: TStudent[]
  selectedStudentId?: string
  estimate?: {
    schoolYear: string
    classId: string
  }
}

// Context is new on every request
export interface DnevnikContext extends Context {
  reqId: string
  session: DnevnikSession
  scene: Scenes.SceneContextScene<DnevnikContext>
}

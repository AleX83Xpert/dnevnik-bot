import { Context, Scenes } from "telegraf"
import { TStudent } from "../clients/DnevnikClientTypes"
import { Message, Update } from "telegraf/typings/core/types/typegram"

export type TDnevnikTokens = {
  accessToken: string
  refreshToken: string
}

interface DnevnikSession extends Scenes.SceneSession {
  telegramUser: unknown // TODO Type from keystone
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

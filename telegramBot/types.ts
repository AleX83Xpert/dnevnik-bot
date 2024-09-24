import { Context, Scenes } from "telegraf"
import { TStudent } from "../clients/DnevnikClientTypes"

export type TDnevnikTokens = {
  accessToken: string
  refreshToken: string
}

interface DnevnikSession extends Scenes.SceneSession {
	students: TStudent[]
  selectedStudentId: string
}

export interface DnevnikContext extends Context {
  match: any
  reqId?: string
  scene: Scenes.SceneContextScene<DnevnikContext> | undefined
  session?: DnevnikSession
}

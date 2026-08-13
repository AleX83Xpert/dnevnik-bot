import { TStudent, TEstimatePeriod } from '../clients/dnevnik/DnevnikClientTypes'

// ─── MessengerUser type (matches schema.ts MessengerUser list) ───
export interface MessengerUser {
  id: string
  platform: string
  platformUserId: string
  dnevnikAccessToken?: string
  dnevnikAccessTokenExpirationDate?: string
  dnevnikRefreshToken?: string
  dnevnikTokensUpdatedAt?: string
  isBlocked: boolean
  meta: unknown
}

// ─── Conversation state (discriminated union) ───
export type ConversationState =
  | { name: 'AUTH_REQUIRED' }
  | { name: 'SELECTING_STUDENT' }
  | { name: 'MAIN_MENU'; studentId: string }
  | { name: 'VIEWING_SCHEDULE'; studentId: string }
  | { name: 'VIEWING_HOMEWORK'; studentId: string }
  | { name: 'VIEWING_GRADES'; studentId: string; periods: TEstimatePeriod[]; schoolYear: string; classId: string }

// ─── Session (stored in Redis, per user per transport) ───
export interface BotSession {
  state: ConversationState
  students: TStudent[]
  selectedStudentId?: string
  messageRef?: MessageRef    // the menu message to edit on transitions
}

// ─── UI primitives ───
export interface InlineKeyboard {
  buttons: { text: string; callbackId: string }[][]
}
export interface ReplyKeyboard {
  text: string
  url?: string              // for web app / deep link buttons
}
export interface MessageRef {
  messageId: string | number
  chatId: string | number
}

// ─── Transport adapter ───
export interface TransportAdapter {
  platform: string

  reply(text: string, keyboard?: InlineKeyboard): Promise<MessageRef>
  editText(messageRef: MessageRef, text: string, keyboard?: InlineKeyboard): Promise<void>
  deleteMessage(messageRef: MessageRef): Promise<void>

  getLoginKeyboard(): ReplyKeyboard
  sendLoginPrompt(text: string): Promise<MessageRef>
  removeKeyboard(text: string): Promise<MessageRef>
  bold(text: string): string
  escape(text: string): string

  getMessageRef(): MessageRef | undefined
  setMessageRef(ref: MessageRef): void
}

// ─── Bot context (created per incoming update) ───
export interface BotContext {
  reqId: string
  user?: MessengerUser
  session: BotSession
  transport: TransportAdapter
  fromName?: string  // platform-specific user display name for greetings
}

// ─── Domain events (platform updates normalized) ───
export type DomainEvent =
  | { type: 'START' }
  | { type: 'COMMAND'; command: string }
  | { type: 'BUTTON_CLICKED'; actionId: string }
  | { type: 'TOKENS_RECEIVED'; tokens: { accessToken: string; refreshToken: string } }
  | { type: 'MESSAGE'; text: string }

// ─── Diary tokens ───
export interface DiaryTokens {
  accessToken: string
  refreshToken: string
}

import type { TransportAdapter, InlineKeyboard, MessageRef, BotSession } from '../../core/types.js'
import { config } from '../../config.js'

export class MaxTransportAdapter implements TransportAdapter {
  platform = 'max'
  private session: BotSession
  private userId: number
  private api: any // Max Bot API instance

  constructor (userId: number, api: any, session: BotSession, messageRef?: MessageRef) {
    this.userId = userId
    this.api = api
    this.session = session
    // Use the messageRef from callback query if session doesn't have one
    if (!this.session.messageRef && messageRef) {
      this.session.messageRef = messageRef
    }
  }

  async reply (text: string, keyboard?: InlineKeyboard): Promise<MessageRef> {
    const attachments = keyboard ? this.toInlineKeyboard(keyboard) : undefined
    const sent = await this.api.sendMessageToUser(this.userId, text, {
      format: 'html',
      attachments: attachments || undefined,
    })
    return { messageId: sent.body.mid, chatId: this.userId }
  }

  async editText (messageRef: MessageRef, text: string, keyboard?: InlineKeyboard): Promise<void> {
    const attachments = keyboard ? this.toInlineKeyboard(keyboard) : undefined
    await this.api.editMessage(String(messageRef.messageId), {
      text,
      format: 'html',
      attachments: attachments || undefined,
    })
  }

  async deleteMessage (messageRef: MessageRef): Promise<void> {
    await this.api.deleteMessage(String(messageRef.messageId))
  }

  async sendLoginPrompt (text: string): Promise<MessageRef> {
    if (!config.maxLoginPageUrl) throw new Error('MAX_LOGIN_PAGE_URL is required for MAX transport')
    // MAX: open_app button opens the mini-app directly within MAX
    // web_app is the bot username, payload becomes WebAppStartParam in the URL
    const attachments = [{
      type: 'inline_keyboard',
      payload: {
        buttons: [[{
          type: 'open_app',
          text: 'Подключить дневник',
          web_app: config.maxBotUsername,
          payload: 'login',
        }]],
      },
    }]
    const sent = await this.api.sendMessageToUser(this.userId, text, { format: 'html', attachments })
    return { messageId: sent.body.mid, chatId: this.userId }
  }

  async removeKeyboard (text: string): Promise<MessageRef> {
    // MAX has no persistent reply keyboard to remove
    return this.reply(text)
  }

  bold (text: string): string {
    return `<b>${text}</b>`
  }

  escape (text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  getMessageRef (): MessageRef | undefined { return this.session.messageRef }
  setMessageRef (ref: MessageRef): void { this.session.messageRef = ref }

  private toInlineKeyboard (kb: InlineKeyboard) {
    return [{
      type: 'inline_keyboard',
      payload: {
        buttons: kb.buttons.map(row =>
          row.map(btn => ({
            type: 'callback',
            text: btn.text,
            payload: btn.callbackId,
          }))
        ),
      },
    }]
  }
}

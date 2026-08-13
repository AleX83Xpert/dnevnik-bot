import { TransportAdapter, InlineKeyboard, ReplyKeyboard, MessageRef } from '../../core/types'
import { config } from '../../config'

export class MaxTransportAdapter implements TransportAdapter {
  platform = 'max'
  private messageRef: MessageRef | undefined
  private userId: number
  private api: any // Max Bot API instance

  constructor (userId: number, api: any, messageRef?: MessageRef) {
    this.userId = userId
    this.api = api
    this.messageRef = messageRef
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

  getLoginKeyboard (): ReplyKeyboard {
    // MAX uses deep links to mini-app
    if (!config.maxLoginPageUrl) throw new Error('MAX_LOGIN_PAGE_URL is required for MAX transport')
    return { text: 'Подключить дневник', url: config.maxLoginPageUrl }
  }

  async sendLoginPrompt (text: string): Promise<MessageRef> {
    if (!config.maxLoginPageUrl) throw new Error('MAX_LOGIN_PAGE_URL is required for MAX transport')
    // MAX: send message with a link button to the mini-app
    const attachments = [{
      type: 'inline_keyboard',
      keyboard: {
        buttons: [[{
          type: 'link',
          text: 'Подключить дневник',
          url: config.maxLoginPageUrl,
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

  getMessageRef (): MessageRef | undefined { return this.messageRef }
  setMessageRef (ref: MessageRef): void { this.messageRef = ref }

  private toInlineKeyboard (kb: InlineKeyboard) {
    return [{
      type: 'inline_keyboard',
      keyboard: {
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

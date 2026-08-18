import { Context, Markup } from 'telegraf'
import { TransportAdapter, InlineKeyboard, MessageRef, BotSession } from '../../core/types'
import { escMd, boldMd } from './formatters'
import { config } from '../../config'

export class TelegramTransportAdapter implements TransportAdapter {
  platform = 'telegram'
  private ctx: Context
  private session: BotSession

  constructor (ctx: Context, session: BotSession) {
    this.ctx = ctx
    this.session = session
    // Capture the current message ref from callback query (the message the button was on)
    // Only use it if the session doesn't already have one
    if (!this.session.messageRef && ctx.callbackQuery?.message) {
      this.session.messageRef = {
        messageId: (ctx.callbackQuery.message as any).message_id,
        chatId: (ctx.callbackQuery.message as any).chat.id,
      }
    }
  }

  async reply (text: string, keyboard?: InlineKeyboard): Promise<MessageRef> {
    const replyMarkup = keyboard ? this.toInlineKeyboard(keyboard) : undefined
    const parseMode = this.needsMarkdownV2(text) ? 'MarkdownV2' : undefined
    const sent = await this.ctx.reply(text, { ...replyMarkup, parse_mode: parseMode })
    return { messageId: sent.message_id, chatId: sent.chat.id }
  }

  async editText (messageRef: MessageRef, text: string, keyboard?: InlineKeyboard): Promise<void> {
    const replyMarkup = keyboard ? this.toInlineKeyboard(keyboard) : undefined
    const parseMode = this.needsMarkdownV2(text) ? 'MarkdownV2' : undefined
    await this.ctx.telegram.editMessageText(
      messageRef.chatId, Number(messageRef.messageId), undefined, text,
      { ...replyMarkup, parse_mode: parseMode }
    )
  }

  async deleteMessage (messageRef: MessageRef): Promise<void> {
    await this.ctx.telegram.deleteMessage(messageRef.chatId, Number(messageRef.messageId))
  }

  async sendLoginPrompt (text: string): Promise<MessageRef> {
    if (!config.loginPageUrl) throw new Error('LOGIN_PAGE_URL is required for Telegram transport')
    const keyboard = Markup.keyboard([Markup.button.webApp('Подключить дневник', config.loginPageUrl)]).resize()
    const sent = await this.ctx.reply(text, keyboard)
    return { messageId: sent.message_id, chatId: sent.chat.id }
  }

  async removeKeyboard (text: string): Promise<MessageRef> {
    const sent = await this.ctx.reply(text, Markup.removeKeyboard())
    return { messageId: sent.message_id, chatId: sent.chat.id }
  }

  bold (text: string): string { return boldMd(text) }
  escape (text: string): string { return escMd(text) }

  getMessageRef (): MessageRef | undefined { return this.session.messageRef }
  setMessageRef (ref: MessageRef): void { this.session.messageRef = ref }

  private toInlineKeyboard (kb: InlineKeyboard) {
    return Markup.inlineKeyboard(
      kb.buttons.map(row => row.map(btn => Markup.button.callback(btn.text, btn.callbackId)))
    )
  }

  /**
   * Detects whether the text contains MarkdownV2 formatting that needs parse_mode.
   * If the text has escaped characters (backslash before special chars) or bold markers (*text*),
   * it needs MarkdownV2. Plain text without any formatting is sent without parse_mode to avoid
   * "Character '!' is reserved" errors on unescaped special characters.
   */
  private needsMarkdownV2 (text: string): boolean {
    // Check for escaped special characters: \!, \., \-, \_, \*, etc.
    if (/\\[\\_*\[\]()~`>#\+\-=|{}.!]/.test(text)) return true
    // Check for bold markers: *text*
    if (/\*[^*]+\*/.test(text)) return true
    return false
  }
}

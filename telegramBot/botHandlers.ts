import { KeystoneContext } from "@keystone-6/core/types"
import { Context, Markup } from "telegraf"
import { Message, Update } from "telegraf/typings/core/types/typegram";
import { findOrCreateTelegramUser } from "./botUtils";
import { TDnevnikTokens } from "./types";
import { DnevnikClient } from "../clients/DnevnikClient"
import dayjs from "dayjs";
import { refreshAndSaveTokens } from '../utils/dnevnikTokensRefresher'

export async function onStart(godContext: KeystoneContext, ctx: Context<{ message: Update.New & Update.NonChannel & Message.TextMessage; update_id: number; }>): Promise<void> {
  const telegramId = String(ctx.from.id)

  await findOrCreateTelegramUser(godContext, telegramId, ctx.from)

  ctx.reply(`Здравствуйте, ${ctx.from.first_name ?? ctx.from.username ?? 'человек'}! Это бот для работы с дневником. Он подключается к дневнику, используя ваш аккаунт. Чтобы указать данные аккаунта, используйте команду /login.`)
}

export async function onSendTokens(godContext: KeystoneContext, ctx: Context<Update.MessageUpdate<Record<"web_app_data", {}> & Message.WebAppDataMessage>>) {
  const data = ctx.webAppData?.data.json() as TDnevnikTokens
  const telegramId = String(ctx.from.id)

  await findOrCreateTelegramUser(godContext, telegramId, ctx.from)

  await refreshAndSaveTokens(godContext, telegramId, { accessToken: data.accessToken, refreshToken: data.refreshToken })

  ctx.reply('Готово! Бот подключен к вашему аккаунту в дневнике. Чтобы отключить все это используйте команду /logout.', Markup.removeKeyboard())
}

export async function onLogout(godContext: KeystoneContext, ctx: Context<{ message: Update.New & Update.NonChannel & Message.TextMessage; update_id: number; }>) {
  const telegramId = String(ctx.from.id)

  await godContext.db.TelegramUser.updateOne({
    where: { telegramId },
    data: {
      dnevnikAccessToken: null,
      dnevnikAccessTokenExpirationDate: null,
      dnevnikRefreshToken: null,
      dnevnikTokensUpdatedAt: null,
    }
  })

  ctx.reply('Good bye :\'(', Markup.removeKeyboard())
}
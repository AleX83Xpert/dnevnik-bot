import { KeystoneContext } from "@keystone-6/core/types"
import { Context, Markup, Scenes } from "telegraf"
import { Message, Update } from "telegraf/typings/core/types/typegram"
import { findOrCreateTelegramUser, getKeyboardWithLoginButton } from "./botUtils"
import { DnevnikContext, TDnevnikTokens } from "./types"
import { ALL_TELEGRAM_USER_FIELDS } from "./constants/fields"
import dayjs from "dayjs"
import { fetchFromDnevnik } from "../utils/dnevnikFetcher"
import { DnevnikClient } from "../clients/DnevnikClient"
import { DnevnikClientUnauthorizedError } from "../clients/DnevnikClientErrors"
import { Lists } from '.keystone/types'

export async function onStart(godContext: KeystoneContext, ctx: DnevnikContext): Promise<void> {
  const telegramId = String(ctx.from.id)

  const telegramUser = await findOrCreateTelegramUser(godContext, telegramId, ctx.from)

  if (telegramUser.dnevnikAccessToken && telegramUser.dnevnikRefreshToken) {
    // User already registered and has tokens

    ctx.session.telegramUser = telegramUser
    const studentsResult = await fetchFromDnevnik({ telegramUser, godContext, ctx, request: { action: 'students' } })

    if (studentsResult && studentsResult.isParent) {
      ctx.session.students = studentsResult.students
      await ctx.scene.enter('select_student')
    }
  } else {
    await ctx.reply(`Здравствуйте, ${ctx.from.first_name ?? ctx.from.username ?? 'человек'}! Это бот для работы с дневником. Он подключается к дневнику, используя ваш аккаунт. Чтобы указать данные аккаунта, используйте команду /login.`)
  }
}

export async function onSendTokens(godContext: KeystoneContext, ctx: DnevnikContext & Context<Update.MessageUpdate<Record<"web_app_data", {}> & Message.WebAppDataMessage>>) {
  const data = ctx.webAppData.data.json() as TDnevnikTokens
  const telegramId = String(ctx.from.id)

  const dnevnikClientWithUserTokens = new DnevnikClient({ accessToken: data.accessToken, refreshToken: data.refreshToken })

  try {
    const newTokens = await dnevnikClientWithUserTokens.refreshTokens()

    const telegramUserWithRefreshedTokens = await godContext.query.TelegramUser.updateOne({
      where: { telegramId },
      data: {
        dnevnikAccessToken: newTokens.accessToken,
        dnevnikAccessTokenExpirationDate: dayjs().add(15, 'minutes').toISOString(), //newTokens.accessTokenExpirationDate,
        dnevnikRefreshToken: newTokens.refreshToken,
        dnevnikTokensUpdatedAt: dayjs().toISOString(),
      },
      query: ALL_TELEGRAM_USER_FIELDS,
    }) as Lists.TelegramUser.Item

    const studentsResult = await fetchFromDnevnik({ telegramUser: telegramUserWithRefreshedTokens, godContext, ctx, request: { action: 'students' } })

    if (studentsResult) {
      ctx.session.telegramUser = telegramUserWithRefreshedTokens
      if (studentsResult.isParent) {
        await ctx.reply('Готово! Бот подключен к вашему аккаунту в дневнике. Чтобы отключить все это используйте команду /logout.')
        ctx.session.students = studentsResult.students
        await ctx.scene.enter('select_student')
      } else {
        await godContext.query.TelegramUser.updateOne({
          where: { telegramId },
          data: {
            dnevnikAccessToken: '',
            dnevnikAccessTokenExpirationDate: null,
            dnevnikRefreshToken: '',
            dnevnikTokensUpdatedAt: null,
          },
        })
        await ctx.reply('Ой ой, кажется вы пытаетесь подключить не родительскую учетную запись. Я пока не умею работать с такими.', Markup.removeKeyboard())
      }
    }
  } catch (err) {
    if (err instanceof DnevnikClientUnauthorizedError) {
      await ctx.reply('Ммм, похоже что токены, которые вы только что отправили, уже устарели. Или вы их перепутали. Или взяли не из того места. Давайте попробуем еще разок.', getKeyboardWithLoginButton())
    } else {
      await ctx.reply('Похоже что-то случилось с сервером дневника. Попробуйте позже. Кнопка на том же месте.', getKeyboardWithLoginButton())
    }
  }
}

export async function onLogout(godContext: KeystoneContext, ctx: Context<{ message: Update.New & Update.NonChannel & Message.TextMessage; update_id: number; }>) {
  const telegramId = String(ctx.from.id)

  await godContext.query.TelegramUser.updateOne({
    where: { telegramId },
    data: {
      dnevnikAccessToken: '',
      dnevnikAccessTokenExpirationDate: null,
      dnevnikRefreshToken: '',
      dnevnikTokensUpdatedAt: null,
    },
  })

  await ctx.reply('Что ж, таков путь. Я удалил ваши токены и более не смогу получать данные. Но вы можете вернуть все обратно через команду /login', Markup.removeKeyboard())
}

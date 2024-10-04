import { KeystoneContext } from "@keystone-6/core/types"
import { Context, Markup, NarrowedContext } from "telegraf"
import { Message, Update } from "telegraf/typings/core/types/typegram"
import { createTelegramUser, findOrCreateTelegramUser, findTelegramUser, getKeyboardWithLoginButton } from "./botUtils"
import { DnevnikContext, TDnevnikTokens } from "./types"
import dayjs from "dayjs"
import { DnevnikClient } from "../clients/dnevnik/DnevnikClient"
import { DnevnikClientExternalServerError, DnevnikClientUnauthorizedError } from "../clients/dnevnik/DnevnikClientErrors"
import { DEFAULT_TELEGRAM_TOKENS_TTL_SEC } from "../utils/constants"
import { get } from "lodash"

export async function onStart(godContext: KeystoneContext, ctx: Context<{
  message: Update.New & Update.NonChannel & Message.TextMessage;
  update_id: number;
}> & DnevnikContext): Promise<void> {
  const telegramId = String(ctx.from.id)

  const telegramUser = await findTelegramUser(godContext, telegramId)

  if (telegramUser) {
    if (telegramUser.dnevnikAccessToken && telegramUser.dnevnikRefreshToken) {
      // User already registered and has tokens
      await ctx.scene.enter('select_student')
    } else {
      await ctx.reply(`Снова здравствуйте! Нужно повторно подключить дневник. Кнопка для этого уже внизу 👇`, getKeyboardWithLoginButton())
    }
  } else {
    await createTelegramUser(godContext, telegramId, ctx.from)
    await ctx.reply(`Здравствуйте, ${ctx.from.first_name ?? ctx.from.username ?? 'человек'}! Это бот для работы с дневником. Он подключается к дневнику, используя ваш аккаунт. Чтобы указать данные аккаунта, используйте команду /login.`)
  }
}

export async function onSendTokens(godContext: KeystoneContext, ctx: NarrowedContext<DnevnikContext, Update.MessageUpdate<Record<"web_app_data", {}> & Message.WebAppDataMessage>>) {
  if (ctx.webAppData) {
    const data = ctx.webAppData.data.json() as TDnevnikTokens
    const telegramId = String(ctx.from.id)
    const telegramUser = await findOrCreateTelegramUser(godContext, telegramId, ctx.from)

    const dnevnikClientWithUserTokens = new DnevnikClient({ accessToken: data.accessToken, refreshToken: data.refreshToken })

    try {
      const newTokens = await dnevnikClientWithUserTokens.refreshTokens()

      await godContext.query.TelegramUser.updateOne({
        where: { telegramId: telegramUser.telegramId },
        data: {
          dnevnikAccessToken: newTokens.accessToken,
          dnevnikAccessTokenExpirationDate: dayjs().add(Number(get(process.env, 'TELEGRAM_TOKENS_TTL_SEC', DEFAULT_TELEGRAM_TOKENS_TTL_SEC)), 'seconds').toISOString(), //newTokens.accessTokenExpirationDate,
          dnevnikRefreshToken: newTokens.refreshToken,
          dnevnikTokensUpdatedAt: dayjs().toISOString(),
        },
      })

      await ctx.reply('Готово! Бот подключен к вашему аккаунту в дневнике. Чтобы отключить все это используйте команду /logout.', Markup.removeKeyboard())
      await ctx.scene.enter('select_student')
    } catch (err) {
      if (err instanceof DnevnikClientUnauthorizedError) {
        await ctx.reply('Ммм, похоже что токены, которые вы только что отправили, уже устарели. Или вы их перепутали. Или взяли не из того места. Давайте попробуем еще разок.', getKeyboardWithLoginButton())
      } else if (err instanceof DnevnikClientExternalServerError) {
        await ctx.reply('Похоже что-то случилось с сервером дневника. Попробуйте позже. Кнопка на том же месте.', getKeyboardWithLoginButton())
      } else {
        await ctx.reply('По моему вы отправили не токены. Попробуйте еще раз.', getKeyboardWithLoginButton())
      }
    }
  } else {
    await ctx.reply('Не удалось получить данные (токены), которые вы отправили. Попробуйте еще раз.', getKeyboardWithLoginButton())
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

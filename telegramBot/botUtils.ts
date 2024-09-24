import { KeystoneContext } from "@keystone-6/core/types";
import { Markup } from "telegraf";
import { ALL_TELEGRAM_USER_FIELDS } from "./constants/fields";
import { DnevnikContext } from "./types";

export async function findOrCreateTelegramUser(godContext: KeystoneContext, telegramId: string, meta: unknown) {
  let telegramUser = await godContext.query.TelegramUser.findOne({ where: { telegramId }, query: ALL_TELEGRAM_USER_FIELDS })

  if (!telegramUser) {
    telegramUser = await godContext.query.TelegramUser.createOne({
      data: {
        telegramId,
        meta,
      },
      query: ALL_TELEGRAM_USER_FIELDS,
    })
  }

  return telegramUser
}

export function getKeyboardWithLoginButton() {
  const loginPageUrl = `${process.env.SERVER_URL}/static/loginPage.html`
  return Markup.keyboard([Markup.button.webApp('Подключить дневник', loginPageUrl)]).resize()
}

export function getSelectedStudent(ctx: DnevnikContext) {
  return ctx.session?.students.find((student) => student.id === ctx.session?.selectedStudentId)
}

export function getSelectedStudentName(ctx: DnevnikContext) {
  const student = getSelectedStudent(ctx)
  return `${student?.firstName} ${student?.lastName}`
}

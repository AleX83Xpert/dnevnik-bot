import { KeystoneContext } from "@keystone-6/core/types";


export async function findOrCreateTelegramUser(godContext: KeystoneContext, telegramId: string, meta: unknown) {
  let telegramUser = await godContext.db.TelegramUser.findOne({ where: { telegramId } })
  if (!telegramUser) {
    telegramUser = await godContext.db.TelegramUser.createOne({
      data: {
        telegramId,
        meta,
      }
    })
  }

  return telegramUser
}

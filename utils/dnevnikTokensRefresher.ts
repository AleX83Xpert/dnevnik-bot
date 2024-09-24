import { KeystoneContext } from "@keystone-6/core/types"
import { getLogger } from "./logger"
import dayjs from "dayjs"
import { DnevnikClient } from "../clients/DnevnikClient"
import { ALL_TELEGRAM_USER_FIELDS } from "../telegramBot/constants/fields"

const logger = getLogger('dnevnikTokensRefresher')

let refreshInterval: NodeJS.Timeout

export async function startTokensRefresher(godContext: KeystoneContext, intervalSec: number = 60, refreshBeforeSec: number = 600) {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  refreshInterval = setInterval(async () => {
    logger.info({ msg: 'refresh tokens' })

    const expiredSoonUsers = await godContext.query.TelegramUser.findMany({
      where: {
        dnevnikAccessTokenExpirationDate: {
          lte: dayjs().add(refreshBeforeSec, 'seconds').toISOString(),
          gte: dayjs().toISOString(),
        },
        dnevnikAccessToken: { not: { equals: '' } },
        dnevnikRefreshToken: { not: { equals: '' } },
      },
      query: ALL_TELEGRAM_USER_FIELDS,
    })

    for (const telegramUser of expiredSoonUsers) {
      try {
        const telegramId = telegramUser.telegramId
        const dnevnikClient = new DnevnikClient({ accessToken: telegramUser.dnevnikAccessToken, refreshToken: telegramUser.dnevnikRefreshToken })

        const newTokens = await dnevnikClient.refreshTokens()

        if (newTokens) {
          await godContext.query.TelegramUser.updateOne({
            where: { telegramId },
            data: {
              dnevnikAccessToken: newTokens.accessToken,
              dnevnikAccessTokenExpirationDate: newTokens.accessTokenExpirationDate,
              dnevnikRefreshToken: newTokens.refreshToken,
              dnevnikTokensUpdatedAt: dayjs().toISOString(),
            },
            query: ALL_TELEGRAM_USER_FIELDS,
          })

          logger.info({ msg: 'tokens refreshed', telegramId: telegramUser.telegramId })
        }
      } catch (err) {
        logger.error({ msg: 'tokens refresh error', telegramId: telegramUser.telegramId, err })
      }
    }
  }, intervalSec * 1000)
}

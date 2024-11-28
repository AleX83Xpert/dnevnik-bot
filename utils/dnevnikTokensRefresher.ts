import { KeystoneContext } from "@keystone-6/core/types"
import { getLogger } from "./logger"
import dayjs from "dayjs"
import { DnevnikClient } from "../clients/dnevnik/DnevnikClient"
import { ALL_TELEGRAM_USER_FIELDS } from "../telegramBot/constants/fields"
import { DnevnikClientUnauthorizedError } from "../clients/dnevnik/DnevnikClientErrors"
import { getTokenExpirationDate } from "./jwt"
import { cutToken } from "../telegramBot/botUtils"

const logger = getLogger('dnevnikTokensRefresher')

let refreshInterval: NodeJS.Timeout

export async function startTokensRefresher (godContext: KeystoneContext, intervalSec: number = 60, refreshBeforeSec: number = 600) {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  refreshInterval = setInterval(async () => {
    logger.info({ msg: 'refresh tokens' })

    const expiredSoonUsers = await godContext.query.TelegramUser.findMany({
      where: {
        dnevnikAccessTokenExpirationDate: {
          lte: dayjs().add(refreshBeforeSec, 'seconds').toISOString(),
        },
        dnevnikAccessToken: { not: { equals: '' } },
        dnevnikRefreshToken: { not: { equals: '' } },
      },
      query: ALL_TELEGRAM_USER_FIELDS,
    })

    for (const telegramUser of expiredSoonUsers) {
      const telegramId = telegramUser.telegramId

      try {
        const dnevnikClient = new DnevnikClient({ accessToken: telegramUser.dnevnikAccessToken, refreshToken: telegramUser.dnevnikRefreshToken })

        const newTokens = await dnevnikClient.refreshTokens()

        if (newTokens) {
          const dnevnikAccessTokenExpirationDate = getTokenExpirationDate(newTokens.accessToken)

          await godContext.query.TelegramUser.updateOne({
            where: { telegramId },
            data: {
              dnevnikAccessToken: newTokens.accessToken,
              dnevnikAccessTokenExpirationDate,
              dnevnikRefreshToken: newTokens.refreshToken,
              dnevnikTokensUpdatedAt: dayjs().toISOString(),
            }
          })

          logger.info({ msg: 'tokens refreshed', telegramId: telegramUser.telegramId, accessToken: cutToken(newTokens.accessToken), refreshToken: cutToken(newTokens.refreshToken), accessTokenExpirationDate: dnevnikAccessTokenExpirationDate })
        }
      } catch (err) {
        if (err instanceof DnevnikClientUnauthorizedError) {
          await godContext.query.TelegramUser.updateOne({
            where: { telegramId },
            data: {
              dnevnikAccessToken: null,
              dnevnikAccessTokenExpirationDate: null,
              dnevnikRefreshToken: null,
              dnevnikTokensUpdatedAt: dayjs().toISOString(),
            }
          })
        }

        logger.error({ msg: 'tokens refresh error', telegramId: telegramUser.telegramId, err })
      }
    }
  }, intervalSec * 1000)
}

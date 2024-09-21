import { KeystoneContext } from "@keystone-6/core/types"
import { getLogger } from "./logger"
import dayjs from "dayjs"
import { DnevnikClient } from "../clients/DnevnikClient"
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
        dnevnikAccessTokenExpirationDate: { lte: dayjs().add(refreshBeforeSec, 'seconds').toISOString() },
        NOT: [
          { dnevnikAccessToken: '' },
          { dnevnikRefreshToken: '' },
        ],
      },
    })

    for (const telegramUser of expiredSoonUsers) {
      try {
        await refreshAndSaveTokens(godContext, telegramUser.telegramId as string, { accessToken: telegramUser.dnevnikAccessToken as string, refreshToken: telegramUser.dnevnikRefreshToken as string })
        logger.info({ msg: 'tokens refreshed', telegramId: telegramUser.telegramId as string })
      } catch (err) {
        logger.error({ msg: 'tokens refresh error', telegramId: telegramUser.telegramId as string, err })
      }
    }
  }, intervalSec * 1000)
}

export async function refreshAndSaveTokens(godContext: KeystoneContext, telegramId: string, tokens: { accessToken: string, refreshToken: string }) {
  const dnevnikClient = new DnevnikClient(tokens)

  const newTokens = await dnevnikClient.refreshTokens()

  await godContext.query.TelegramUser.updateOne({
    where: { telegramId },
    data: {
      dnevnikAccessToken: newTokens.accessToken,
      dnevnikAccessTokenExpirationDate: newTokens.accessTokenExpirationDate,
      dnevnikRefreshToken: newTokens.refreshToken,
      dnevnikTokensUpdatedAt: dayjs().toISOString(),
    }
  })
}

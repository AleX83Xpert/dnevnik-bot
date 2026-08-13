import { KeystoneContext } from '@keystone-6/core/types'
import { DnevnikClient } from '../clients/dnevnik/DnevnikClient'
import { DnevnikClientUnauthorizedError } from '../clients/dnevnik/DnevnikClientErrors'
import { findExpiringUsers, updateUserTokens, clearUserTokens } from './userRepo'
import { getTokenExpirationDate } from '../utils/jwt'
import { getLogger } from '../utils/logger'
import dayjs from 'dayjs'

const logger = getLogger('tokenRefresher')
let refreshInterval: NodeJS.Timeout
let isRefreshing = false

function cutToken (str: string) {
  return `${str.substring(0, 10)}...${str.substring(str.length - 10)}`
}

export function startTokenRefresher (
  godContext: KeystoneContext,
  intervalSec: number,
  refreshBeforeSec: number
) {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  refreshInterval = setInterval(async () => {
    if (isRefreshing) return
    isRefreshing = true
    try {
      logger.info({ msg: 'refresh tokens' })

      const users = await findExpiringUsers(
        godContext,
        dayjs().add(refreshBeforeSec, 'seconds').toISOString()
      )

      for (const user of users) {
        try {
          const dnevnikClient = new DnevnikClient({
            accessToken: user.dnevnikAccessToken!,
            refreshToken: user.dnevnikRefreshToken!,
          })

          const newTokens = await dnevnikClient.refreshTokens()

          if (newTokens) {
            const dnevnikAccessTokenExpirationDate = getTokenExpirationDate(newTokens.accessToken)

            await updateUserTokens(godContext, user.id, {
              accessToken: newTokens.accessToken,
              accessTokenExpirationDate: dnevnikAccessTokenExpirationDate,
              refreshToken: newTokens.refreshToken,
            })

            logger.info({ msg: 'tokens refreshed', platform: user.platform, platformUserId: user.platformUserId, accessToken: cutToken(newTokens.accessToken), refreshToken: cutToken(newTokens.refreshToken), accessTokenExpirationDate: dnevnikAccessTokenExpirationDate })
          }
        } catch (err) {
          if (err instanceof DnevnikClientUnauthorizedError) {
            await clearUserTokens(godContext, user.id)
          }

          logger.error({ msg: 'tokens refresh error', platform: user.platform, platformUserId: user.platformUserId, err })
        }
      }
    } finally {
      isRefreshing = false
    }
  }, intervalSec * 1000)
}

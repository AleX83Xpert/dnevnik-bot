import type { KeystoneContext } from '@keystone-6/core/types'
import { DnevnikClient } from '../clients/dnevnik/DnevnikClient.js'
import type { TClassesParams, TClassesResult, TEstimateParams, TEstimatePeriodsParams, TEstimatePeriodsResult, TEstimateResult, TEstimateYearsParams, TEstimateYearsResult, THomeworkParams, THomeworkResult, TScheduleParams, TScheduleResult, TStudentsResult } from '../clients/dnevnik/DnevnikClientTypes.js'
import { DnevnikClientExternalServerError, DnevnikClientHttpResponseError, DnevnikClientUnauthorizedError } from '../clients/dnevnik/DnevnikClientErrors.js'
import dayjs from 'dayjs'
import { getLogger } from '../utils/logger.js'
import { getTokenExpirationDate } from '../utils/jwt.js'
import type { BotContext } from './types.js'
import { NoUserError, NoTokensError } from './errors.js'
import { updateUserTokens, clearUserTokens } from './userRepo.js'

// Track in-flight refresh promises per user to prevent competing refreshes
const inFlightRefreshes = new Map<string, Promise<void>>()

type TDnevnikRequest =
  | { action: 'students', params?: any }
  | { action: 'schedule', params: TScheduleParams }
  | { action: 'homework', params: THomeworkParams }
  | { action: 'estimateYears', params: TEstimateYearsParams }
  | { action: 'estimatePeriods', params: TEstimatePeriodsParams }
  | { action: 'classes', params: TClassesParams }
  | { action: 'estimate', params: TEstimateParams }

type TActionToResponseMap = {
  students: TStudentsResult
  schedule: TScheduleResult
  homework: THomeworkResult
  estimateYears: TEstimateYearsResult
  estimatePeriods: TEstimatePeriodsResult
  classes: TClassesResult
  estimate: TEstimateResult
}

const dnevnikClientMethodsMap: Record<
  TDnevnikRequest['action'],
  <TReq extends TDnevnikRequest, TResMap extends TActionToResponseMap>(
    dnevnikClient: DnevnikClient,
    params: TReq['params']
  ) => Promise<any>
> = {
  students: (client) => client.getStudents(),
  schedule: (client, params) => client.getSchedule(params),
  homework: (client, params) => client.getHomeWork(params),
  estimateYears: (client, params) => client.getEstimateYears(params),
  estimatePeriods: (client, params) => client.getEstimatePeriods(params),
  classes: (client, params) => client.getClasses(params),
  estimate: (client, params) => client.getEstimate(params),
}

const logger = getLogger('dnevnikFetcher')

function cutToken (str: string) {
  return `${str.substring(0, 10)}...${str.substring(str.length - 10)}`
}

export async function fetchFromDnevnik<TReq extends TDnevnikRequest, TResMap extends TActionToResponseMap> (options: {
  godContext: KeystoneContext,
  ctx: BotContext,
  request: TReq,
}): Promise<TResMap[TReq['action']] | undefined> {
  const { godContext, ctx, request } = options
  const { user, reqId, transport } = ctx

  if (!user) {
    logger.error({ msg: 'No user', reqId: reqId, request: request })
    throw new NoUserError('No user')
  }

  if (!user.dnevnikAccessToken || !user.dnevnikRefreshToken) {
    logger.error({ msg: 'User contains no tokens', reqId: reqId, request: request, platform: user.platform, platformUserId: user.platformUserId })
    throw new NoTokensError('User contains no tokens')
  }

  // Create shared client instance for this request
  const dnevnikClient = new DnevnikClient({ accessToken: user.dnevnikAccessToken, refreshToken: user.dnevnikRefreshToken })
  const method = dnevnikClientMethodsMap[request.action]

  try {
    logger.info({
      msg: 'request',
      reqId,
      request,
      platform: user.platform,
      platformUserId: user.platformUserId,
      accessToken: cutToken(user.dnevnikAccessToken),
      refreshToken: cutToken(user.dnevnikRefreshToken),
    })

    return await method(dnevnikClient, request.params)
  } catch (err) {
    if (err instanceof DnevnikClientUnauthorizedError) {
      logger.warn({ msg: 'token expired', platform: user.platform, platformUserId: user.platformUserId, reqId, accessToken: cutToken(dnevnikClient.dnevnikAccessToken), refreshToken: cutToken(dnevnikClient.dnevnikRefreshToken), accessTokenExpirationDate: user.dnevnikAccessTokenExpirationDate })

      // Check if there's already a refresh in progress for this user
      let refreshPromise = inFlightRefreshes.get(user.id)
      let refreshFailed = false

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const newTokens = await dnevnikClient.refreshTokens()
            if (newTokens) {
              const dnevnikAccessTokenExpirationDate = getTokenExpirationDate(newTokens.accessToken)
              logger.info({ msg: 'tokens refreshed', platform: user.platform, platformUserId: user.platformUserId, reqId, accessToken: cutToken(newTokens.accessToken), refreshToken: cutToken(newTokens.refreshToken), accessTokenExpirationDate: dnevnikAccessTokenExpirationDate })

              const updatedUser = await updateUserTokens(godContext, user.id, {
                accessToken: newTokens.accessToken,
                accessTokenExpirationDate: dnevnikAccessTokenExpirationDate,
                refreshToken: newTokens.refreshToken,
              })

              ctx.user = updatedUser
            }
          } catch (refreshErr) {
            refreshFailed = true
            logger.warn({ msg: 'tokens refresh failed', reqId, err: refreshErr })

            if (refreshErr instanceof DnevnikClientUnauthorizedError) {
              await clearUserTokens(godContext, user.id)

              await transport.sendLoginPrompt(
                'К сожалению, случилось так что я потерял доступ к вашему аккаунту в дневнике. Причины могут быть разными и даже не зависящими от меня. Но, что есть - то есть. Нам нужно снова получить доступ к вашему аккаунту в дневнике. Кнопка снова внизу, вы знаете что делать.',
              )
            }
          } finally {
            inFlightRefreshes.delete(user.id)
          }
        })()

        inFlightRefreshes.set(user.id, refreshPromise)
      }

      await refreshPromise

      if (refreshFailed) {
        return
      }

      // Retry the request with refreshed tokens
      return await method(dnevnikClient, request.params)
    } else if (err instanceof DnevnikClientExternalServerError) {
      await transport.reply('Да что ж такое! На сайте дневника сейчас идут технические работы. Ничего не могу поделать 😥')
    } else {
      const { status, statusText } = err as DnevnikClientHttpResponseError
      await transport.reply(`Какие-то проблемы с сервером дневника. Получил код ответа ${status} ${statusText}. Попробуйте немного позже. Если ошибка повторяется, то воспользуйтесь командой /start.`)
    }
  }
}

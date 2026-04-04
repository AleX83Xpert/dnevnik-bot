import { KeystoneContext } from "@keystone-6/core/types"
import { DnevnikClient } from "../clients/dnevnik/DnevnikClient"
import { TClassesParams, TClassesResult, TEstimateParams, TEstimatePeriodsParams, TEstimatePeriodsResult, TEstimateResult, TEstimateYearsParams, TEstimateYearsResult, THomeworkParams, THomeworkResult, TScheduleParams, TScheduleResult, TStudentsResult } from "../clients/dnevnik/DnevnikClientTypes"
import { DnevnikClientExternalServerError, DnevnikClientHttpResponseError, DnevnikClientUnauthorizedError } from "../clients/dnevnik/DnevnikClientErrors"
import dayjs from "dayjs"
import { ALL_TELEGRAM_USER_FIELDS } from "../telegramBot/constants/fields"
import { getLogger } from "./logger"
import { cutToken, getKeyboardWithLoginButton } from "../telegramBot/botUtils"
import { Lists } from '.keystone/types'
import { DnevnikContext } from "../telegramBot/types"
import { DnevnikFetcherNoTelegramUserError, DnevnikFetcherNoTokensError } from "./dnevnikFetcherErrors"
import { getTokenExpirationDate } from "./jwt"

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

export async function fetchFromDnevnik<TReq extends TDnevnikRequest, TResMap extends TActionToResponseMap> (options: {
  godContext: KeystoneContext,
  ctx: DnevnikContext,
  request: TReq,
}): Promise<TResMap[TReq['action']] | undefined> {
  const { godContext, ctx, request } = options
  const { telegramUser, reqId } = ctx

  if (!telegramUser) {
    logger.error({ msg: 'No telegramUser', reqId: reqId, request: request })
    throw new DnevnikFetcherNoTelegramUserError('No telegramUser')
  }

  if (!telegramUser.dnevnikAccessToken || !telegramUser.dnevnikRefreshToken) {
    logger.error({ msg: 'TelegramUser contains no tokens', reqId: reqId, request: request, telegramId: telegramUser.telegramId })
    throw new DnevnikFetcherNoTokensError('TelegramUser contains no tokens')
  }

  // Create shared client instance for this request
  const dnevnikClient = new DnevnikClient({ accessToken: telegramUser.dnevnikAccessToken, refreshToken: telegramUser.dnevnikRefreshToken })
  const method = dnevnikClientMethodsMap[request.action]

  try {
    logger.info({
      msg: 'request',
      reqId,
      request,
      telegramId: telegramUser.telegramId,
      accessToken: cutToken(telegramUser.dnevnikAccessToken),
      refreshToken: cutToken(telegramUser.dnevnikRefreshToken),
    })

    return await method(dnevnikClient, request.params)
  } catch (err) {
    if (err instanceof DnevnikClientUnauthorizedError) {
      // Unauthorized! Try to refresh tokens and retry.
      logger.warn({ msg: 'token expired', telegramId: telegramUser.telegramId, reqId, accessToken: cutToken(dnevnikClient.dnevnikAccessToken), refreshToken: cutToken(dnevnikClient.dnevnikRefreshToken), accessTokenExpirationDate: telegramUser.dnevnikAccessTokenExpirationDate })
      try {
        const newTokens = await dnevnikClient.refreshTokens()
        if (newTokens) {
          const dnevnikAccessTokenExpirationDate = getTokenExpirationDate(newTokens.accessToken)
          logger.info({ msg: 'tokens refreshed', telegramId: telegramUser.telegramId, reqId, accessToken: cutToken(newTokens.accessToken), refreshToken: cutToken(newTokens.refreshToken), accessTokenExpirationDate: dnevnikAccessTokenExpirationDate })

          const telegramUserWithRefreshedTokens = await godContext.query.TelegramUser.updateOne({
            where: { telegramId: telegramUser.telegramId },
            data: {
              dnevnikAccessToken: newTokens.accessToken,
              dnevnikAccessTokenExpirationDate,
              dnevnikRefreshToken: newTokens.refreshToken,
              dnevnikTokensUpdatedAt: dayjs().toISOString(),
            },
            query: ALL_TELEGRAM_USER_FIELDS,
          }) as Lists.TelegramUser.Item

          // Update context with refreshed tokens
          ctx.telegramUser = { ...telegramUserWithRefreshedTokens }

          // Retry the request with the same client (now has updated tokens)
          return await method(dnevnikClient, request.params)
        }
      } catch (err) {
        logger.warn({ msg: 'tokens refresh failed', reqId, err })
        // Retry after tokens were refreshed unsuccessfully

        if (err instanceof DnevnikClientUnauthorizedError) {
          // Clear tokens
          await godContext.query.TelegramUser.updateOne({
            where: { telegramId: telegramUser.telegramId },
            data: {
              dnevnikAccessToken: null,
              dnevnikAccessTokenExpirationDate: null,
              dnevnikRefreshToken: null,
              dnevnikTokensUpdatedAt: null,
            },
            query: ALL_TELEGRAM_USER_FIELDS,
          })

          await ctx.reply(
            'К сожалению, случилось так что я потерял доступ к вашему аккаунту в дневнике. Причины могут быть разными и даже не зависящими от меня. Но, что есть - то есть. Нам нужно снова получить доступ к вашему аккаунту в дневнике. Кнопка снова внизу, вы знаете что делать.',
            getKeyboardWithLoginButton(),
          )
        }
      }
    } else if (err instanceof DnevnikClientExternalServerError) { // TODO throw DnevnikFetcherError
      await ctx.reply('Да что ж такое! На сайте дневника сейчас идут технические работы. Ничего не могу поделать 😥')
    } else {
      const { status, statusText } = err as DnevnikClientHttpResponseError
      await ctx.reply(`Какие-то проблемы с сервером дневника. Получил код ответа ${status} ${statusText}. Попробуйте немного позже. Если ошибка повторяется, то воспользуйтесь командой /start.`)
    }
  }
}

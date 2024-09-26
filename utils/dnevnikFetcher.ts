import { KeystoneContext } from "@keystone-6/core/types"
import { DnevnikClient } from "../clients/DnevnikClient"
import { TClassesParams, TClassesResult, TEstimateParams, TEstimatePeriodsParams, TEstimatePeriodsResult, TEstimateResult, TEstimateYearsParams, TEstimateYearsResult, THomeworkParams, THomeworkResult, TScheduleParams, TScheduleResult, TStudentsResult } from "../clients/DnevnikClientTypes"
import { DnevnikClientExternalServerError, DnevnikClientUnauthorizedError } from "../clients/DnevnikClientErrors"
import dayjs from "dayjs"
import { ALL_TELEGRAM_USER_FIELDS } from "../telegramBot/constants/fields"
import { getLogger } from "./logger"
import { getKeyboardWithLoginButton } from "../telegramBot/botUtils"
import { Lists } from '.keystone/types'
import { DnevnikContext } from "../telegramBot/types"

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

export async function fetchFromDnevnik<TReq extends TDnevnikRequest, TResMap extends TActionToResponseMap>(options: {
  godContext: KeystoneContext,
  ctx: DnevnikContext,
  telegramUser: Partial<Lists.TelegramUser.Item>,
  request: TReq,
}): Promise<TResMap[TReq['action']] | undefined> {
  if (!options.telegramUser.dnevnikAccessToken || !options.telegramUser.dnevnikRefreshToken) {
    logger.error({ msg: 'TelegramUser contains no tokens', reqId: options.ctx.reqId, request: options.request, telegramId: options.telegramUser.telegramId })
    throw new Error('TelegramUser contains no tokens')
  }

  const dnevnikClient = new DnevnikClient({ accessToken: options.telegramUser.dnevnikAccessToken, refreshToken: options.telegramUser.dnevnikRefreshToken })

  try {
    const method = dnevnikClientMethodsMap[options.request.action]
    logger.info({ msg: 'request', reqId: options.ctx.reqId, request: options.request, telegramId: options.telegramUser.telegramId })
    return await method(dnevnikClient, options.request.params)
  } catch (err) {
    if (err instanceof DnevnikClientUnauthorizedError) {
      // Unauthorized! Try to refresh tokens and retry.
      try {
        const newTokens = await dnevnikClient.refreshTokens()
        if (newTokens) {
          logger.info({ msg: 'tokens refreshed', telegramId: options.telegramUser.telegramId, reqId: options.ctx.reqId })

          const telegramUserWithRefreshedTokens = await options.godContext.query.TelegramUser.updateOne({
            where: { telegramId: options.telegramUser.telegramId },
            data: {
              dnevnikAccessToken: newTokens.accessToken,
              dnevnikAccessTokenExpirationDate: dayjs().add(10, 'minutes').toISOString(), //newTokens.accessTokenExpirationDate,
              dnevnikRefreshToken: newTokens.refreshToken,
              dnevnikTokensUpdatedAt: dayjs().toISOString(),
            },
            query: ALL_TELEGRAM_USER_FIELDS,
          }) as Lists.TelegramUser.Item

          return fetchFromDnevnik({ ...options, telegramUser: telegramUserWithRefreshedTokens })
        }
      } catch (err) {
        logger.warn({ msg: 'tokens refresh failed', reqId: options.ctx.reqId, err })
        // Retry after tokens were refreshed unsuccessfully
        // Clear tokens
        await options.godContext.query.TelegramUser.updateOne({
          where: { telegramId: options.telegramUser.telegramId },
          data: {
            dnevnikAccessToken: '',
            dnevnikAccessTokenExpirationDate: null,
            dnevnikRefreshToken: '',
            dnevnikTokensUpdatedAt: null,
          },
          query: ALL_TELEGRAM_USER_FIELDS,
        })

        options.ctx.reply(
          'К сожалению, случилось так что я потерял доступ к вашему аккаунту в дневнике. Причины могут быть разными и даже не зависящими от меня. Но, что есть - то есть. Нам нужно снова получить доступ к вашему аккаунту в дневнике. Кнопка снова внизу, вы знаете что делать.',
          getKeyboardWithLoginButton(),
        )
      }
    } else if (err instanceof DnevnikClientExternalServerError) {
      options.ctx.reply('Да что ж такое! На сайте дневника сейчас идут технические работы. Ничего не могу поделать 😥')
    } else {
      throw err
    }
  }
}

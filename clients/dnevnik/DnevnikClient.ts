import { isObject } from 'lodash'
import { DnevnikClientExternalServerError, DnevnikClientHttpResponseError, DnevnikClientUnauthorizedError } from './DnevnikClientErrors'
import { TClassesResult, TDnevnikClientArgs, TEstimateResult, THomeworkDoneParams, THomeworkDoneResult, THomeworkParams, THomeworkResult, TEstimatePeriodsResult, TRefreshTokenBody, TRefreshTokenResult, TScheduleParams, TScheduleResult, TStudentsResult, TEstimateSubjectsResult, TEstimateYearsParams, TEstimateYearsResult, TEstimatePeriodsParams, TEstimateSubjectsParams, TClassesParams, TEstimateParams } from './DnevnikClientTypes'
import { getLogger } from '../../utils/logger'
import { cutToken } from '../../telegramBot/botUtils'
import crypto from 'node:crypto'

export class DnevnikClient {
  private logger

  private apiUrl = 'https://dnevnik.egov66.ru/api'
  public readonly dnevnikAccessToken: string
  public readonly dnevnikRefreshToken: string

  constructor(args: TDnevnikClientArgs) {
    this.logger = getLogger('DnevnikClient')
    this.dnevnikAccessToken = args.accessToken
    this.dnevnikRefreshToken = args.refreshToken
  }

  private async fetch<TBody = object, TResult = object> (path: string, body: TBody | undefined = undefined) {
    const options: RequestInit = {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.dnevnikAccessToken}`,
        'content-type': 'application/json',
      },
      method: 'GET',
    }

    if (isObject(body)) {
      options.body = JSON.stringify(body)
      options.method = 'POST'
    }

    const fetchId = crypto.randomUUID()
    const start = Date.now()
    this.logger.info({ msg: 'fetchStart', fetchId, apiUrl: this.apiUrl, path, accessToken: cutToken(this.dnevnikAccessToken), refreshToken: cutToken(this.dnevnikRefreshToken) })
    const result = await fetch(`${this.apiUrl}${path}`, options)
    const duration = Date.now() - start
    this.logger.info({ msg: 'fetchEnd', fetchId, duration, status: result.status })

    switch (result.status) {
      case 200: return await result.json() as TResult

      case 400:
      case 401:
      case 403: throw new DnevnikClientUnauthorizedError({ path, status: result.status, statusText: result.statusText })

      case 502:
      case 504: throw new DnevnikClientExternalServerError({ path, status: result.status, statusText: result.statusText })

      default: throw new DnevnikClientHttpResponseError({ path, status: result.status, statusText: result.statusText })
    }
  }

  public async refreshTokens () {
    return await this.fetch<TRefreshTokenBody, TRefreshTokenResult>('/auth/Token/Refresh', { refreshToken: this.dnevnikRefreshToken })
  }

  public async getStudents () {
    return await this.fetch<undefined, TStudentsResult>('/students')
  }

  public async getSchedule (params: TScheduleParams) {
    const urlParams = new URLSearchParams()

    urlParams.append('studentId', params.studentId)


    if (params.pageNumber) {
      urlParams.append('pageNumber', String(params.pageNumber))
    }

    if (params.date) {
      urlParams.append('date', String(params.date))
    }

    return await this.fetch<undefined, TScheduleResult>(`/schedule?${urlParams.toString()}`)
  }

  /**
   * 
   * @param studentId
   * @param date YYYY-MM-DD
   * @returns 
   */
  public async getHomeWork (params: THomeworkParams) {
    return await this.fetch<undefined, THomeworkResult>(`/homework?date=${params.date}&studentId=${params.studentId}`)
  }

  public async setHomeworkDone (params: THomeworkDoneParams) {
    return await this.fetch<THomeworkDoneParams, THomeworkDoneResult>('/homework/done', params)
  }

  public async getEstimateYears (params: TEstimateYearsParams) {
    return await this.fetch<undefined, TEstimateYearsResult>(`/estimate/years?studentId=${params.studentId}`)
  }

  public async getEstimatePeriods (params: TEstimatePeriodsParams) {
    // Also exists url `/periods` for periods. It returns only 4 quarters.
    return await this.fetch<undefined, TEstimatePeriodsResult>(`/estimate/periods?schoolYear=${params.schoolYear}&studentId=${params.studentId}`)
  }

  public async getEstimateSubjects (params: TEstimateSubjectsParams) {
    return await this.fetch<undefined, TEstimateSubjectsResult>(`/subjects?schoolYear=${params.schoolYear}&studentId=${params.studentId}`)
  }

  public async getClasses (params: TClassesParams) {
    return await this.fetch<undefined, TClassesResult>(`/classes?schoolYear=${params.schoolYear}&studentId=${params.studentId}`)
  }

  public async getEstimate (params: TEstimateParams) {
    const urlParams = new URLSearchParams()

    urlParams.append('studentId', params.studentId)
    urlParams.append('schoolYear', params.schoolYear)
    urlParams.append('classId', params.classId)
    urlParams.append('periodId', params.periodId)
    urlParams.append('subjectId', params.subjectId)

    if (params.weekNumber) {
      urlParams.append('weekNumber', String(params.weekNumber))
    }

    return await this.fetch<undefined, TEstimateResult>(`/estimate?${urlParams.toString()}`)
  }
}

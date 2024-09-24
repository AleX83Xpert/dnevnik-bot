import { isObject } from 'lodash'
import { DnevnikClientExternalServerError, DnevnikClientHttpResponseError, DnevnikClientUnauthorizedError } from './DnevnikClientErrors'
import { TClassesResult, TDnevnikClientArgs, TEstimateResult, THomeworkResult, TPeriodsResult, TRefreshTokenBody, TRefreshTokenResult, TScheduleParams, TScheduleResult, TStudentsResult, TSubjectsResult, TYearsResult } from './DnevnikClientTypes'

export class DnevnikClient {

  private apiUrl = 'https://dnevnik.egov66.ru/api'
  private dnevnikAccessToken: string
  private dnevnikRefreshToken: string

  constructor(args: TDnevnikClientArgs) {
    this.dnevnikAccessToken = args.accessToken
    this.dnevnikRefreshToken = args.refreshToken
  }

  private async fetch<TBody = object, TResult = object>(path: string, body: TBody | undefined = undefined) {
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

    const result = await fetch(`${this.apiUrl}${path}`, options)

    switch (result.status) {
      case 200: return await result.json() as TResult
      case 401: throw new DnevnikClientUnauthorizedError(result.status, result.statusText)
      case 502: throw new DnevnikClientExternalServerError(result.status, result.statusText)
      default: throw new DnevnikClientHttpResponseError(result.status, result.statusText)
    }
  }

  public async refreshTokens() {
    return await this.fetch<TRefreshTokenBody, TRefreshTokenResult>('/auth/Token/Refresh', { refreshToken: this.dnevnikRefreshToken })
  }

  public async getStudents() {
    return await this.fetch<undefined, TStudentsResult>('/students')
  }

  public async getSchedule(data: TScheduleParams) {
    const urlParams = new URLSearchParams()

    urlParams.append('studentId', data.studentId)


    if (data.pageNumber) {
      urlParams.append('pageNumber', String(data.pageNumber))
    }

    if (data.date) {
      urlParams.append('date', String(data.date))
    }

    return await this.fetch<undefined, TScheduleResult>(`/schedule?${urlParams.toString()}`)
  }

  /**
   * 
   * @param studentId
   * @param date YYYY-MM-DD
   * @returns 
   */
  public async getHomeWork(studentId: string, date: string) {
    return await this.fetch<undefined, THomeworkResult>(`/homework?date=${date}&studentId=${studentId}`)
  }

  public async getEstimateYears(studentId: string) {
    return await this.fetch<undefined, TYearsResult>(`/estimate/years?studentId=${studentId}`)
  }

  public async getEstimatePeriods(studentId: string, schoolYear: string) {
    return await this.fetch<undefined, TPeriodsResult>(`/periods?schoolYear=${schoolYear}&studentId=${studentId}`)
  }

  public async getEstimateSubjects(studentId: string, schoolYear: string) {
    return await this.fetch<undefined, TSubjectsResult>(`/subjects?schoolYear=${schoolYear}&studentId=${studentId}`)
  }

  public async getClasses(studentId: string, schoolYear: string) {
    return await this.fetch<undefined, TClassesResult>(`/classes?schoolYear=${schoolYear}&studentId=${studentId}`)
  }

  public async getEstimate(data: { studentId: string, schoolYear: string, periodId: string, weekNumber?: number, classId: string, subjectId: string }) {
    const urlParams = new URLSearchParams()

    urlParams.append('studentId', data.studentId)
    urlParams.append('schoolYear', data.schoolYear)
    urlParams.append('classId', data.classId)
    urlParams.append('periodId', data.periodId)
    urlParams.append('subjectId', data.subjectId)

    if (data.weekNumber) {
      urlParams.append('weekNumber', String(data.weekNumber))
    }

    return await this.fetch<undefined, TEstimateResult>(`/estimate?${urlParams.toString()}`)
  }
}

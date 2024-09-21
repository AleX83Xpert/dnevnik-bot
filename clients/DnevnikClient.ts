import { isObject } from "lodash"

type TDnevnikClientArgs = {
  accessToken: string
  refreshToken: string
}

type TRefreshTokenBody = {
  refreshToken: string
}

type TRefreshTokenResult = {
  accessToken: string
  accessTokenExpirationDate: string
  refreshToken: string
}

type TStudentsResult = {
  isParent: boolean
  students: {
    id: string
    avatarId?: string
    orgName: string
    className: string
    firstName: string
    lastName: string
    surName: string
  }[]
}

type TPaginationData = {
  hasNextPage: boolean
  hasPreviousPage: boolean
  pageActionLink?: string
  pageNumber: number
  pageNumberOutOfRange: boolean
  pageSize: number
  totalCount: number
  totalPages: number
}

type TScheduleResult = {
  schoolYear: string
  paginationData: TPaginationData
  scheduleModel: {
    beginDate: string
    endDate: string
    weekNumber: number
    days: {
      date: string
      dayOfWeekName: string
      isCelebration: boolean
      isWeekend: boolean
      scheduleDayLessonModels: {
        beginHour: number
        beginMinute: number
        endHour: number
        endMinute: number
        groupName?: string
        id: string
        lessonName: string
        lessonid: string
        number: number
        room: string
      }[]
    }[]
  }

}

type THomeworkResult = {
  date: string
  pagination: {
    nextDate: string
    previousDate: string
  }
  homeworks: {
    description: string
    endTime: string
    homeWorkFiles: unknown[]
    id: string
    isDone: boolean
    isHomeworkElectronicForm: boolean
    lessonId: string
    lessonName: string
    lessonNumber: number
    startTime: string
  }[]
}

type TYearsResult = {
  currentYear: {
    id: string
    text: string
  }
  schoolYears: {
    id: string
    text: string
  }[]
}

type TPeriodsResult = {
  periods: {
    id: string
    name: string
  }[]
}

type TSubjectsResult = {
  subjects: {
    id: string
    name: string
  }[]
}

type TClassesResult = {
  currentClass: {
    text: string
    value: string
  }
  gradeItemModels: {
    text: string
    value: string
  }[]
}

type TEstimateResult = {
  periodGradesTable?: unknown
  showAverageWeighted: boolean
  weekGradesTable: {
    beginDate: string
    endDate: string
    paginationData: TPaginationData
    days: {
      date: string
      lessonGrades: {
        beginHour: number
        beginMinute: number
        endHour: number
        endMinute: number
        grades: string[][]
        lessonId: string
        name: string
        presence?: unknown
        sequenceNumber: number
      }[]
    }[]
  }
  yearGradesTable?: unknown
}

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
        accept: "application/json, text/plain, */*",
        authorization: `Bearer ${this.dnevnikAccessToken}`,
        "content-type": "application/json",
      },
      method: 'GET',
    }

    if (isObject(body)) {
      options.body = JSON.stringify(body)
      options.method = "POST"
    }

    const result = await fetch(`${this.apiUrl}${path}`, options)

    if (result.status !== 200) {
      throw new Error(`Error status: ${result.status}, ${result.statusText}`)
    }

    const data: TResult = await result.json()

    return data
  }

  public async refreshTokens() {
    return await this.fetch<TRefreshTokenBody, TRefreshTokenResult>('/auth/Token/Refresh', { refreshToken: this.dnevnikRefreshToken })
  }

  public async getStudents() {
    return await this.fetch<undefined, TStudentsResult>('/students')
  }

  public async getSchedule(studentId: string, pageNumber: number) {
    return await this.fetch<undefined, TScheduleResult>(`/schedule?pageNumber=${pageNumber}&studentId=${studentId}`)
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

  public async getYears(studentId: string) {
    return await this.fetch<undefined, TYearsResult>(`/estimate/years?studentId=${studentId}`)
  }

  public async getPeriods(studentId: string, schoolYear: string) {
    return await this.fetch<undefined, TPeriodsResult>(`/periods?schoolYear=${schoolYear}&studentId=${studentId}`)
  }

  public async getSubjects(studentId: string, schoolYear: string) {
    return await this.fetch<undefined, TSubjectsResult>(`/subjects?schoolYear=${schoolYear}&studentId=${studentId}`)
  }

  public async getClasses(studentId: string, schoolYear: string) {
    return await this.fetch<undefined, TClassesResult>(`/classes?schoolYear=${schoolYear}&studentId=${studentId}`)
  }

  public async getEstimate(studentId: string, schoolYear: string, periodId: string, classId: string, subjectId: string) {
    return await this.fetch<undefined, TEstimateResult>(`/estimate?schoolYear=${schoolYear}&classId=${classId}&periodId=${periodId}&subjectId=${subjectId}&studentId=${studentId}`)
  }
}

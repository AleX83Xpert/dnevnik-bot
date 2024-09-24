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

export type TEstimateResult = {
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

export type TDnevnikClientArgs = {
  accessToken: string
  refreshToken: string
}

export type TRefreshTokenBody = {
  refreshToken: string
}

export type TRefreshTokenResult = {
  accessToken: string
  accessTokenExpirationDate: string
  refreshToken: string
}

export type TStudent = {
  id: string
  avatarId?: string
  orgName: string
  className: string
  firstName: string
  lastName: string
  surName: string
}

export type TStudentsResult = {
  isParent: boolean
  students: TStudent[]
}

export type TScheduleParams = { studentId: string, pageNumber?: number, date?: string }

export type TScheduleDay = {
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
}

export type TScheduleResult = {
  schoolYear: string
  paginationData: TPaginationData
  scheduleModel: {
    beginDate: string
    endDate: string
    weekNumber: number
    days: TScheduleDay[]
  }
}

export type THomeworkResult = {
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

export type TYearsResult = {
  currentYear: {
    id: string
    text: string
  }
  schoolYears: {
    id: string
    text: string
  }[]
}

export type TPeriodsResult = {
  periods: {
    id: string
    name: string
  }[]
}

export type TSubjectsResult = {
  subjects: {
    id: string
    name: string
  }[]
}

export type TClassesResult = {
  currentClass: {
    text: string
    value: string
  }
  gradeItemModels: {
    text: string
    value: string
  }[]
}

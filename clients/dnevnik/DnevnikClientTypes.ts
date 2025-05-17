export type TEstimateParams = {
  studentId: string
  schoolYear: string
  periodId: string
  weekNumber?: number
  classId: string
  subjectId: string
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

export type TEstimateResultYearGradesTableLessonGrade = {
  finallyGrade?: unknown
  grades: {
    averageGrade: number
    averageWeightedGrade: number
    finallygrade?: number
    periodId: string
  }[]
  lesson: {
    id: string
    name: string
  }
  testGrade?: unknown
  yearGrade?: unknown
}

export type TEstimateResultYearGradesTable = {
  lessonGrades: TEstimateResultYearGradesTableLessonGrade[]
  periods: TEstimatePeriod[]
}

export type TEstimateResult = {
  periodGradesTable?: {
    days: { date: string }[]
    disciplines: {
      averageGrade: number
      averageWeightedGrade: number
      name: string
      totalGrade?: unknown
      grades: {
        date: string
        grades: string[][]
        lessonId: string
        presence?: unknown
      }[]
    }[]
  }
  showAverageWeighted: boolean
  weekGradesTable?: {
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
  yearGradesTable?: TEstimateResultYearGradesTable
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

export type TSheduleDayLessonModel =  {
  beginHour: number | null
  beginMinute: number | null
  endHour: number | null
  endMinute: number | null
  groupName?: string
  id: string
  lessonName: string
  lessonid: string
  number: number
  room: string
}

export type TScheduleDay = {
  date: string
  dayOfWeekName: string
  isCelebration: boolean
  isWeekend: boolean
  scheduleDayLessonModels: TSheduleDayLessonModel[]
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

export type THomeWorkFile = {
  id: string
  name: string // original file name
  size: number // file size in bytes
  type: string // mime-type
}

export type THomework = {
  description: string
  endTime: string
  homeWorkFiles: THomeWorkFile[]
  id: string
  isDone: boolean
  isHomeworkElectronicForm: boolean
  lessonId: string
  lessonName: string
  lessonNumber: number
  startTime: string
}

export type THomeworkParams = {
  studentId: string
  date: string
}

export type THomeworkResult = {
  date: string
  pagination: {
    nextDate: string
    previousDate: string
  }
  homeworks: THomework[]
}

export type THomeworkDoneParams = {
  studentId: string
  homeworkId: string
  isDone: boolean
}

export type THomeworkDoneResult = { isDone: boolean }

export type TEstimateYearsParams = { studentId: string }

export type TEstimateYearsResult = {
  currentYear: {
    id: string
    text: string
  }
  schoolYears: {
    id: string
    text: string
  }[]
}

export type TEstimatePeriodsParams = { studentId: string, schoolYear: string }

export type TEstimatePeriod = {
  id: string
  name: string
}

export type TEstimatePeriodsResult = {
  periods: TEstimatePeriod[]
}

export type TEstimateSubjectsParams = { studentId: string, schoolYear: string }

export type TEstimateSubjectsResult = {
  subjects: {
    id: string
    name: string
  }[]
}

export type TClassesParams = { studentId: string, schoolYear: string }

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

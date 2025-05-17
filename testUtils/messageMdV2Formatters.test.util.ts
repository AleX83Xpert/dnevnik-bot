import { faker } from '@faker-js/faker'
import { TEstimateResultYearGradesTableLessonGrade, THomework, TScheduleDay, TSheduleDayLessonModel } from '../clients/dnevnik/DnevnikClientTypes'

export function createTestHomeworkItem (attrs: Partial<THomework> = {}): THomework {
  return {
    description: faker.string.alphanumeric({ length: { min: 10, max: 20 } }),
    endTime: faker.date.soon().toISOString(),
    homeWorkFiles: [],
    id: faker.string.uuid(),
    isDone: false,
    isHomeworkElectronicForm: false,
    lessonId: faker.string.uuid(),
    lessonName: faker.string.alphanumeric({ length: { min: 10, max: 20 } }),
    lessonNumber: 1,
    startTime: faker.date.future().toISOString(),
    ...attrs,
  }
}

export function createTestScheduleDayLessonModel (attrs: Partial<TSheduleDayLessonModel> = {}): TSheduleDayLessonModel {
  return {
    beginHour: 8,
    beginMinute: 1,
    endHour: 8,
    endMinute: 40,
    id: faker.string.uuid(),
    lessonName: faker.string.alphanumeric({ length: { min: 10, max: 20 } }),
    lessonid: faker.string.uuid(),
    number: 1,
    room: faker.string.alphanumeric(3),
    ...attrs,
  }
}

export function createTestScheduleDay (attrs: Partial<TScheduleDay> = {}): TScheduleDay {
  return {
    date: faker.date.soon().toISOString(),
    dayOfWeekName: faker.date.weekday(),
    isCelebration: false,
    isWeekend: false,
    scheduleDayLessonModels: [
      createTestScheduleDayLessonModel(),
      createTestScheduleDayLessonModel(),
    ],
    ...attrs,
  }
}

export function createTestYearGradesLessonItem (numberOfPeriods = 4, attrs: Partial<TEstimateResultYearGradesTableLessonGrade> = {}): TEstimateResultYearGradesTableLessonGrade {
  return {
    finallyGrade: faker.number.int({ min: 2, max: 5 }),
    grades: Array(numberOfPeriods).fill(null).map(() => ({
      averageGrade: faker.number.float({ min: 2, max: 5, fractionDigits: 2 }),
      averageWeightedGrade: faker.number.float({ min: 2, max: 5, fractionDigits: 2 }),
      finallygrade: faker.number.int({ min: 2, max: 5 }),
      periodId: faker.string.uuid(),
    })),
    lesson: {
      id: faker.string.uuid(),
      name: faker.book.title(),
    },
    testGrade: faker.number.int({ min: 2, max: 5 }),
    yearGrade: faker.number.int({ min: 2, max: 5 }),
    ...attrs,
  }
}

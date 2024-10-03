import { faker } from '@faker-js/faker'
import { THomework, TScheduleDay, TSheduleDayLessonModel } from '../clients/DnevnikClientTypes';

export function createTestHomeworkItem (attrs: Partial<THomework> = {}): THomework {
  return {
    description: faker.word.noun(),
    endTime: faker.date.soon().toISOString(),
    homeWorkFiles: [],
    id: faker.string.uuid(),
    isDone: false,
    isHomeworkElectronicForm: false,
    lessonId: faker.string.uuid(),
    lessonName: faker.word.noun(),
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
    lessonName: faker.word.noun(),
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

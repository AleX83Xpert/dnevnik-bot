import { createTestHomeworkItem, createTestScheduleDay, createTestScheduleDayLessonModel, createTestYearGradesLessonItem } from "../testUtils/messageMdV2Formatters.test.util"
import { formatHomeworkItem, formatScheduleDay, formatTime, formatYearGradesLesson } from "./messageMdV2Formatters"

describe('messageMarkdownV2Formatters', () => {
  test('formatHomeworkItem', () => {
    const hwItem = createTestHomeworkItem()
    const str = formatHomeworkItem(hwItem)
    expect(str).toBe(`🔴 Урок ${hwItem.lessonNumber}, *${hwItem.lessonName}*\n>${hwItem.description}||`)
  })

  describe('formatTime works correctly', () => {
    const cases = [
      { time: [8, 50], expectStr: '08:50' },
      { time: [9, 30], expectStr: '09:30' },
      { time: [0, 30], expectStr: '00:30' },
      { time: [8, 0], expectStr: '08:00' },
    ]

    test.each(cases)('status $time must be $expectStr', async ({ time, expectStr }) => {
      expect(formatTime(time[0], time[1])).toBe(expectStr)
    })
  })

  describe('formatScheduleDay works correctly with different values for time', () => {
    const cases = [
      { time: [8, 50, 9, 30], expectTimeStr: '08:50\\.\\.09:30 · ' },
      { time: [0, 30, 8, 0], expectTimeStr: '00:30\\.\\.08:00 · ' },
      { time: [null, null, null, null], expectTimeStr: '' },
      { time: [1, null, null, null], expectTimeStr: '' },
      { time: [null, 2, null, null], expectTimeStr: '' },
      { time: [null, null, 3, null], expectTimeStr: '' },
      { time: [null, null, null, 4], expectTimeStr: '' },
      { time: [null, 2, 3, 4], expectTimeStr: '' },
      { time: [1, null, 3, 4], expectTimeStr: '' },
      { time: [1, 2, null, 4], expectTimeStr: '' },
      { time: [1, 2, 3, null], expectTimeStr: '' },
    ]

    test.each(cases)('status $time must be "$expectTimeStr"', async ({ time, expectTimeStr }) => {
      const lesson = createTestScheduleDayLessonModel({
        beginHour: time[0],
        beginMinute: time[1],
        endHour: time[2],
        endMinute: time[3],
      })
      const day = createTestScheduleDay({ scheduleDayLessonModels: [lesson] })
      expect(formatScheduleDay(day)).toBe(`${lesson.number}\\. ${expectTimeStr}${lesson.lessonName}, ${lesson.room}`)
    })
  })

  describe('formatYearGradesLesson', () => {
    test('two periods and all possible finaly grades', () => {
      const item = createTestYearGradesLessonItem(2)
      item.grades[1].finallygrade = undefined // test average grades for this period
      const str = formatYearGradesLesson(item)
      expect(str).toBe(`${item.lesson.name}\n*${item.grades[0].finallygrade}* · ${String(item.grades[1].averageGrade).replace('.', '\\.')}/${String(item.grades[1].averageWeightedGrade).replace('.', '\\.')} ⋯ Год *${item.yearGrade}*, Тест *${item.testGrade}*, Итог *${item.finallyGrade}*`)
    })

    test('two periods and year grade only', () => {
      const item = createTestYearGradesLessonItem(2)
      item.grades[1].finallygrade = undefined // test average grades for this period
      item.testGrade = undefined // no test grade
      item.finallyGrade = undefined // no finally grade
      const str = formatYearGradesLesson(item)
      expect(str).toBe(`${item.lesson.name}\n*${item.grades[0].finallygrade}* · ${String(item.grades[1].averageGrade).replace('.', '\\.')}/${String(item.grades[1].averageWeightedGrade).replace('.', '\\.')} ⋯ Год *${item.yearGrade}*`)
    })

    test('two periods, year grade and finally grade', () => {
      const item = createTestYearGradesLessonItem(2)
      item.testGrade = undefined
      const str = formatYearGradesLesson(item)
      expect(str).toBe(`${item.lesson.name}\n*${item.grades[0].finallygrade}* · *${item.grades[1].finallygrade}* ⋯ Год *${item.yearGrade}*, Итог *${item.finallyGrade}*`)
    })
  })
})
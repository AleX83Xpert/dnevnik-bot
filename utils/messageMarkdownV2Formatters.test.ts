import { THomework } from "../clients/DnevnikClientTypes"
import { createTestHomeworkItem, createTestScheduleDay, createTestScheduleDayLessonModel } from "../testUtils/messageMarkdownV2Formatters.test.util"
import { formatHomeworkItem, formatScheduleDay, formatTime } from "./messageMarkdownV2Formatters"

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
})
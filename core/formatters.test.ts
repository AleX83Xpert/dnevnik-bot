import { describe, test, expect } from 'vitest'
import { formatTime, formatFileSize, formatStudentMainMenuTitle, formatScheduleDay, formatHomeworkItem, formatYearGradesLesson } from './formatters.js'
import type { TransportAdapter } from './types.js'
import type { TStudent, TScheduleDay, THomework, TEstimateResultYearGradesTableLessonGrade } from '../clients/dnevnik/DnevnikClientTypes.js'

// Minimal mock transport that only implements what formatters actually use
const mockTransport: TransportAdapter = {
  platform: 'test',
  bold: (text: string) => `*${text}*`,
  escape: (text: string) => text,
  reply: async () => ({ messageId: 1, chatId: 1 }),
  editText: async () => {},
  deleteMessage: async () => {},
  sendLoginPrompt: async () => ({ messageId: 1, chatId: 1 }),
  removeKeyboard: async () => ({ messageId: 1, chatId: 1 }),
  getMessageRef: () => undefined,
  setMessageRef: () => {},
}

function makeStudent(attrs: Partial<TStudent> = {}): TStudent {
  return { id: '1', firstName: 'Ivan', lastName: 'Ivanov', surName: 'I.', orgName: 'Школа №1', className: '7A', ...attrs }
}

function makeScheduleDay(attrs: Partial<TScheduleDay> = {}): TScheduleDay {
  return {
    date: '2024-09-01',
    dayOfWeekName: 'Sunday',
    isCelebration: false,
    isWeekend: true,
    scheduleDayLessonModels: [
      {
        number: 1,
        lessonName: 'Math',
        room: '101',
        lessonid: '1',
        id: '1',
        beginHour: 9,
        beginMinute: 0,
        endHour: 9,
        endMinute: 45,
      },
    ],
    ...attrs,
  }
}

function makeHomework(attrs: Partial<THomework> = {}): THomework {
  return {
    id: '1',
    lessonId: '1',
    lessonName: 'Math',
    lessonNumber: 1,
    description: 'Solve equations',
    isDone: false,
    isHomeworkElectronicForm: false,
    startTime: '2024-09-01T14:00:00',
    endTime: '2024-09-01T15:00:00',
    homeWorkFiles: [],
    ...attrs,
  }
}

function makeGrade(attrs: Partial<TEstimateResultYearGradesTableLessonGrade> = {}): TEstimateResultYearGradesTableLessonGrade {
  return {
    lesson: { id: '1', name: 'Math' },
    grades: [{ averageGrade: 4.5, averageWeightedGrade: 4.8, periodId: '1' }],
    ...attrs,
  }
}

describe('formatters', () => {
  describe('formatTime', () => {
    test('formats hour and minute with leading zeros', () => {
      expect(formatTime(9, 5)).toBe('09:05')
    })

    test('handles full values', () => {
      expect(formatTime(14, 30)).toBe('14:30')
    })

    test('handles midnight', () => {
      expect(formatTime(0, 0)).toBe('00:00')
    })
  })

  describe('formatFileSize', () => {
    test('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    test('formats kilobytes', () => {
      // 1500 bytes = 1.4648... kB → rounds to 1.46
      expect(formatFileSize(1500)).toBe('1.46 kB')
    })

    test('formats megabytes', () => {
      // 1 500 000 bytes = 1.4305... MB → rounds to 1.43
      expect(formatFileSize(1500000)).toBe('1.43 MB')
    })

    test('formats gigabytes', () => {
      // 1.5 GB exactly
      expect(formatFileSize(1500000000)).toBe('1.4 GB')
    })
  })

  describe('formatStudentMainMenuTitle', () => {
    test('formats student name and class', () => {
      const formatted = formatStudentMainMenuTitle(makeStudent(), mockTransport)
      expect(formatted).toContain('*Ivan Ivanov*')
      expect(formatted).toContain('Школа №1')
      expect(formatted).toContain('7A')
    })
  })

  describe('formatScheduleDay', () => {
    test('formats schedule with lessons', () => {
      const formatted = formatScheduleDay(makeScheduleDay(), mockTransport)
      expect(formatted).toContain('1.')
      expect(formatted).toContain('Math')
      expect(formatted).toContain('09:00..09:45 · ')
    })

    test('handles lesson without time', () => {
      const day = makeScheduleDay({
        scheduleDayLessonModels: [
          {
            number: 2,
            lessonName: 'English',
            room: '202',
            lessonid: '2',
            id: '2',
            beginHour: null,
            beginMinute: null,
            endHour: null,
            endMinute: null,
          },
        ],
      })
      const formatted = formatScheduleDay(day, mockTransport)
      expect(formatted).toContain('2.')
      expect(formatted).toContain('English')
    })
  })

  describe('formatHomeworkItem', () => {
    test('formats homework without attachments', () => {
      const formatted = formatHomeworkItem(makeHomework(), mockTransport)
      expect(formatted).toContain('🔴')
      expect(formatted).toContain('*Math*')
      expect(formatted).toContain('Solve equations')
    })

    test('formats done homework', () => {
      const formatted = formatHomeworkItem(makeHomework({ isDone: true }), mockTransport)
      expect(formatted).toContain('🟢')
    })

    test('includes attachments', () => {
      const formatted = formatHomeworkItem(makeHomework({
        homeWorkFiles: [{ id: '1', name: 'homework.pdf', size: 50000, type: 'application/pdf' }],
      }), mockTransport)
      expect(formatted).toContain('homework.pdf (48.83 kB)')
    })
  })

  describe('formatYearGradesLesson', () => {
    test('formats lesson with grades', () => {
      const formatted = formatYearGradesLesson(makeGrade(), mockTransport)
      expect(formatted).toContain('Math')
      expect(formatted).toContain('4.5/4.8')
    })
  })
})

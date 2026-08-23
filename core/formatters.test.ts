import { describe, test, expect } from "@jest/globals"
import { formatTime, formatFileSize, formatStudentMainMenuTitle, formatScheduleDay, formatHomeworkItem, formatYearGradesLesson } from './formatters.js'
import type { TransportAdapter } from './types.js'

// Mock transport adapter
class MockTransport implements TransportAdapter {
  platform = 'test'
  bold(text: string): string { return `*${text}*` }
  escape(text: string): string { return text }
  getMessageRef(): any { return undefined }
  setMessageRef(ref: any): void {}
  async reply(): Promise<any> { return {} }
  async editText(): Promise<void> {}
  async deleteMessage(): Promise<void> {}
  async sendKeyboard(): Promise<any> { return {} }
  async editKeyboard(): Promise<void> {}
  async clearKeyboard(): Promise<void> {}
  async sendLoginPrompt(): Promise<any> { return {} }
  async removeKeyboard(): Promise<void> {}
}

describe('formatters', () => {
  describe('formatTime', () => {
    test('formats time correctly', () => {
      const date = new Date('2024-01-01T14:30:00')
      expect(formatTime(date)).toBe('14:30')
    })

    test('handles midnight', () => {
      const date = new Date('2024-01-01T00:00:00')
      expect(formatTime(date)).toBe('00:00')
    })
  })

  describe('formatFileSize', () => {
    test('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    test('formats kilobytes', () => {
      expect(formatFileSize(1500)).toBe('1.5 KB')
    })

    test('formats megabytes', () => {
      expect(formatFileSize(1500000)).toBe('1.5 MB')
    })

    test('formats gigabytes', () => {
      expect(formatFileSize(1500000000)).toBe('1.5 GB')
    })
  })

  describe('formatStudentMainMenuTitle', () => {
    test('formats student name', () => {
      const student = { firstName: 'John', lastName: 'Doe' }
      const transport = new MockTransport()
      expect(formatStudentMainMenuTitle(student, transport)).toContain('John')
      expect(formatStudentMainMenuTitle(student, transport)).toContain('Doe')
    })
  })

  describe('formatScheduleDay', () => {
    test('formats schedule day', () => {
      const day = {
        date: '2024-01-01',
        lessons: [
          { subject: 'Math', time: '09:00' },
          { subject: 'English', time: '10:00' }
        ]
      }
      const formatted = formatScheduleDay(day, new MockTransport())
      expect(formatted).toContain('Math')
      expect(formatted).toContain('09:00')
    })
  })

  describe('formatHomeworkItem', () => {
    test('formats homework item', () => {
      const homework = {
        subject: 'Math',
        task: 'Solve equations',
        dueDate: '2024-01-10'
      }
      const formatted = formatHomeworkItem(homework, new MockTransport())
      expect(formatted).toContain('Math')
      expect(formatted).toContain('Solve equations')
    })
  })

  describe('formatYearGradesLesson', () => {
    test('formats lesson grades', () => {
      const lesson = {
        subject: 'Math',
        grades: [5, 4, 5]
      }
      const formatted = formatYearGradesLesson(lesson, new MockTransport())
      expect(formatted).toContain('Math')
      expect(formatted).toContain('5')
    })
  })
})

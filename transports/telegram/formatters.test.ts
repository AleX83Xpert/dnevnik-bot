import { describe, test, expect } from 'vitest'
import { escMd, boldMd } from './formatters.ts'

describe('Telegram formatters', () => {
  test('escMd escapes all special characters', () => {
    expect(escMd('hello')).toBe('hello')
    expect(escMd('test_123')).toBe('test\\_123')
    expect(escMd('a*b')).toBe('a\\*b')
    expect(escMd('a.b')).toBe('a\\.b')
    expect(escMd('a!b')).toBe('a\\!b')
  })

  test('boldMd wraps text in asterisks', () => {
    expect(boldMd('hello')).toBe('*hello*')
  })
})

import { describe, test, expect } from 'vitest'
import { NoUserError, NoTokensError } from './errors.js'

describe('fetcher errors', () => {
  test('NoUserError has correct message and name', () => {
    const error = new NoUserError('No user')
    expect(error.message).toBe('No user')
    expect(error.name).toBe('NoUserError')
  })

  test('NoTokensError has correct message and name', () => {
    const error = new NoTokensError('User contains no tokens')
    expect(error.message).toBe('User contains no tokens')
    expect(error.name).toBe('NoTokensError')
  })

  test('NoUserError is instance of Error', () => {
    const error = new NoUserError('Test')
    expect(error instanceof Error).toBe(true)
  })

  test('NoTokensError is instance of Error', () => {
    const error = new NoTokensError('Test')
    expect(error instanceof Error).toBe(true)
  })
})

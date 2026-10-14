import { describe, expect, test, beforeEach, vi } from 'vitest'
import { DnevnikClient } from './DnevnikClient.js'
import { DnevnikClientExternalServerError, DnevnikClientHttpResponseError, DnevnikClientUnauthorizedError } from './DnevnikClientErrors.js'

const mockFetch = vi.fn()
const originalFetch = globalThis.fetch
beforeEach(() => {
  globalThis.fetch = mockFetch as unknown as typeof fetch
  mockFetch.mockReset()
})
afterAll(() => {
  globalThis.fetch = originalFetch
})

describe('DnevnikClient', () => {
  test('should return data if status=200', async () => {
    const client = new DnevnikClient({ accessToken: '', refreshToken: '' })
    const mockData = { a: 1 }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    })

    const result = await client.getStudents()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result).toEqual(mockData)
  })

  describe('should throw error if status !=200', () => {
    const cases = [
      { status: 400, errType: DnevnikClientUnauthorizedError },
      { status: 401, errType: DnevnikClientUnauthorizedError },
      { status: 403, errType: DnevnikClientUnauthorizedError },
      { status: 502, errType: DnevnikClientExternalServerError },
      { status: 504, errType: DnevnikClientExternalServerError },
      { status: 404, errType: DnevnikClientHttpResponseError },
    ]

    test.each(cases)('status $status must throw $errType', async ({ status, errType }) => {
      const client = new DnevnikClient({ accessToken: '', refreshToken: '' })

      mockFetch.mockResolvedValueOnce({ ok: false, status })

      await expect(client.getStudents()).rejects.toThrow(errType)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})

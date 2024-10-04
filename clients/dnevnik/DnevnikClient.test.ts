import { describe, expect, test } from '@jest/globals'
import { DnevnikClient } from './DnevnikClient'
import { DnevnikClientExternalServerError, DnevnikClientHttpResponseError, DnevnikClientUnauthorizedError } from './DnevnikClientErrors'

global.fetch = jest.fn() as jest.Mock

describe('DnevnikClient', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear()
  })

  test('should return data if status=200', async () => {
    const client = new DnevnikClient({ accessToken: '', refreshToken: '' })
    const mockData = { a: 1 }
    const f = fetch as jest.Mock

    f.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    })

    const result = await client.getStudents()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result).toEqual(mockData)
  })

  describe('should throw error if status !=200', () => {
    const cases = [
      { status: 400, errType: DnevnikClientUnauthorizedError },
      { status: 401, errType: DnevnikClientUnauthorizedError },
      { status: 403, errType: DnevnikClientUnauthorizedError },
      { status: 502, errType: DnevnikClientExternalServerError },
      { status: 504, errType: DnevnikClientExternalServerError },
      { status: 403, errType: DnevnikClientHttpResponseError },
      { status: 404, errType: DnevnikClientHttpResponseError },
    ]

    test.each(cases)('status $status must throw $errType', async ({ status, errType }) => {
      const client = new DnevnikClient({ accessToken: '', refreshToken: '' })
      const f = fetch as jest.Mock

      f.mockResolvedValueOnce({ ok: false, status: status })

      await expect(client.getStudents()).rejects.toThrow(errType)
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })
})

import { describe, beforeAll, afterAll, test, expect } from "vitest"
import { createTestGodContext, createTestMessengerUser } from '../testUtils/lists.test.utils.js'
import { faker } from "@faker-js/faker"
import { startTokenRefresher } from './tokenRefresher.js'
import dayjs from 'dayjs'

describe('tokenRefresher', () => {
  let context: any

  beforeAll(async () => {
    context = await createTestGodContext()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  test('finds users with expiring tokens', async () => {
    const expiringDate = dayjs().add(30, 'minutes').toISOString()
    const futureDate = dayjs().add(2, 'days').toISOString()

    const { obj: expiringUser } = await createTestMessengerUser(context, {
      dnevnikAccessToken: faker.string.alphanumeric(20),
      dnevnikRefreshToken: faker.string.alphanumeric(20),
      dnevnikAccessTokenExpirationDate: new Date(expiringDate),
    })

    await createTestMessengerUser(context, {
      dnevnikAccessToken: faker.string.alphanumeric(20),
      dnevnikRefreshToken: faker.string.alphanumeric(20),
      dnevnikAccessTokenExpirationDate: new Date(futureDate),
    })

    const expiringUsers = await context.query.MessengerUser.findMany({
      where: {
        dnevnikAccessTokenExpirationDate: { lte: dayjs().add(1, 'hour').toISOString() },
        dnevnikAccessToken: { not: null },
      },
      query: 'id platformUserId dnevnikAccessTokenExpirationDate',
    })

    expect(expiringUsers.length).toBeGreaterThanOrEqual(1)
    expect(expiringUsers.some((u: any) => u.id === expiringUser.id)).toBe(true)
  })

  test('does not find users with future expiration', async () => {
    const futureDate = dayjs().add(2, 'days').toISOString()

    await createTestMessengerUser(context, {
      dnevnikAccessToken: faker.string.alphanumeric(20),
      dnevnikRefreshToken: faker.string.alphanumeric(20),
      dnevnikAccessTokenExpirationDate: new Date(futureDate),
    })

    const expiringUsers = await context.query.MessengerUser.findMany({
      where: {
        dnevnikAccessTokenExpirationDate: { lte: dayjs().add(1, 'hour').toISOString() },
        dnevnikAccessToken: { not: null },
      },
      query: 'id',
    })

    expect(expiringUsers.length).toBe(0)
  })
})

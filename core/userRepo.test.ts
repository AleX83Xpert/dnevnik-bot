import { describe, beforeAll, test, expect } from "vitest"
import { createTestGodContext, createTestMessengerUser, generateTestPlatformUserId } from '../testUtils/lists.test.utils.js'
import { faker } from "@faker-js/faker"
import { findUser, findOrCreateUser, updateUserTokens, clearUserTokens, findExpiringUsers } from './userRepo.js'
import dayjs from 'dayjs'

describe('userRepo', () => {
  let context: any

  beforeAll(async () => {
    context = await createTestGodContext()
  })

  describe('findUser', () => {
    test('finds existing user by platform and platformUserId', async () => {
      const platformUserId = generateTestPlatformUserId()
      const { obj: createdUser } = await createTestMessengerUser(context, { platformUserId })

      const foundUser = await findUser(context, 'telegram', platformUserId)

      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(createdUser.id)
      expect(foundUser?.platform).toBe('telegram')
      expect(foundUser?.platformUserId).toBe(platformUserId)
    })

    test('returns undefined for non-existent user', async () => {
      const foundUser = await findUser(context, 'telegram', generateTestPlatformUserId())
      expect(foundUser).toBeUndefined()
    })
  })

  describe('findOrCreateUser', () => {
    test('creates new user if not exists', async () => {
      const platformUserId = generateTestPlatformUserId()
      const meta = { username: faker.person.firstName() }

      const user = await findOrCreateUser(context, 'telegram', platformUserId, meta)

      expect(user.platform).toBe('telegram')
      expect(user.platformUserId).toBe(platformUserId)
      expect(user.meta).toEqual(meta)
    })

    test('returns existing user if already exists', async () => {
      const platformUserId = generateTestPlatformUserId()
      const meta = { username: faker.person.firstName() }
      
      const { obj: createdUser } = await createTestMessengerUser(context, { platformUserId, meta })

      const foundUser = await findOrCreateUser(context, 'telegram', platformUserId, meta)

      expect(foundUser.id).toBe(createdUser.id)
    })
  })

  describe('updateUserTokens', () => {
    test('updates user tokens successfully', async () => {
      const { obj: user } = await createTestMessengerUser(context)
      const accessToken = faker.string.alphanumeric(20)
      const refreshToken = faker.string.alphanumeric(20)
      const accessTokenExpirationDate = dayjs().add(1, 'hour').toISOString()

      const updatedUser = await updateUserTokens(context, user.id, {
        accessToken,
        accessTokenExpirationDate,
        refreshToken,
      })

      expect(updatedUser.dnevnikAccessToken).toBe(accessToken)
      expect(updatedUser.dnevnikRefreshToken).toBe(refreshToken)
      expect(updatedUser.dnevnikAccessTokenExpirationDate).toBe(accessTokenExpirationDate)
    })
  })

  describe('clearUserTokens', () => {
    test('clears all user tokens', async () => {
      const accessToken = faker.string.alphanumeric(20)
      const refreshToken = faker.string.alphanumeric(20)
      const { obj: user } = await createTestMessengerUser(context, {
        dnevnikAccessToken: accessToken,
        dnevnikRefreshToken: refreshToken,
      })

      await clearUserTokens(context, user.id)

      const updatedUser = await context.query.MessengerUser.findOne({
        where: { id: user.id },
        query: 'id dnevnikAccessToken dnevnikRefreshToken dnevnikAccessTokenExpirationDate dnevnikTokensUpdatedAt',
      })

      expect(updatedUser.dnevnikAccessToken).toBeNull()
      expect(updatedUser.dnevnikRefreshToken).toBeNull()
    })
  })

  describe('findExpiringUsers', () => {
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

      const expiringUsers = await findExpiringUsers(context, dayjs().add(1, 'hour').toISOString())

      expect(expiringUsers.length).toBeGreaterThanOrEqual(1)
      expect(expiringUsers.some((u: any) => u.id === expiringUser.id)).toBe(true)
    })
  })
})

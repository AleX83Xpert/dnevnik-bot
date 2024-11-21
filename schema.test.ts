import { KeystoneContext } from "@keystone-6/core/types"
import { createTestGodContext, createTestTelegramUser, updateTestTelegramUser } from './testUtils/lists.test.utils'
import { faker } from "@faker-js/faker"

describe('TelegramUser', () => {
  let context: KeystoneContext

  beforeAll(async () => {
    context = await createTestGodContext()
  })

  test('dnevnik tokens are null by default', async () => {
    const { obj: createdTelegramUser } = await createTestTelegramUser(context)

    expect(createdTelegramUser.dnevnikAccessToken).toBeNull()
    expect(createdTelegramUser.dnevnikRefreshToken).toBeNull()
  })

  test('dnevnik tokens can be set to string and back to null', async () => {
    const { obj: createdTelegramUser } = await createTestTelegramUser(context)

    expect(createdTelegramUser.dnevnikAccessToken).toBeNull()
    expect(createdTelegramUser.dnevnikRefreshToken).toBeNull()

    const dnevnikAccessToken = faker.string.alphanumeric(20)
    const dnevnikRefreshToken = faker.string.alphanumeric(20)

    const updatedTelegramUser1 = await updateTestTelegramUser(context, createdTelegramUser.id, { dnevnikAccessToken, dnevnikRefreshToken })

    expect(updatedTelegramUser1.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(updatedTelegramUser1.dnevnikRefreshToken).toBe(dnevnikRefreshToken)

    const updatedTelegramUser2 = await updateTestTelegramUser(context, createdTelegramUser.id, { dnevnikAccessToken: null, dnevnikRefreshToken: null })

    expect(updatedTelegramUser2.dnevnikAccessToken).toBeNull()
    expect(updatedTelegramUser2.dnevnikRefreshToken).toBeNull()
  })

  test('keep dnevnik tokens unchanged when update other fields', async () => {
    const dnevnikAccessToken = faker.string.alphanumeric(20)
    const dnevnikRefreshToken = faker.string.alphanumeric(20)

    const { obj: createdTelegramUser } = await createTestTelegramUser(context, { dnevnikAccessToken, dnevnikRefreshToken })

    expect(createdTelegramUser.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(createdTelegramUser.dnevnikRefreshToken).toBe(dnevnikRefreshToken)

    const updatedTelegramUser = await updateTestTelegramUser(context, createdTelegramUser.id, { dnevnikAccessTokenExpirationDate: faker.date.soon() })

    expect(updatedTelegramUser.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(updatedTelegramUser.dnevnikRefreshToken).toBe(dnevnikRefreshToken)
  })
})

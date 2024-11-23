import { KeystoneContext } from "@keystone-6/core/types"
import { createTestGodContext, createTestTelegramUser, generateTestTelegramId, updateTestTelegramUser } from './testUtils/lists.test.utils'
import { faker } from "@faker-js/faker"
import { ALL_TELEGRAM_USER_FIELDS } from "./telegramBot/constants/fields"
import { decrypt } from "./keystone/fields/encryptedText/utils"

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

  test('keep existing unencrypted data "as is" on reading and encrypt on update', async () => {
    const unencryptedDnevnikAccessToken = `unencrypted_${faker.string.alphanumeric(20)}`
    const unencryptedDnevnikRefreshToken = `unencrypted_${faker.string.alphanumeric(20)}`

    // insert data with skipping encryption
    const insertedTelegramUser = await context.prisma.TelegramUser.create({
      data: {
        telegramId: generateTestTelegramId(),
        dnevnikAccessToken: unencryptedDnevnikAccessToken,
        dnevnikRefreshToken: unencryptedDnevnikRefreshToken,
      }
    })

    // sure that inserted fields are right
    expect(insertedTelegramUser.dnevnikAccessToken).toBe(unencryptedDnevnikAccessToken)
    expect(insertedTelegramUser.dnevnikRefreshToken).toBe(unencryptedDnevnikRefreshToken)

    // search user using encrypted field
    const createdTelegramUser = await context.query.TelegramUser.findOne({ where: { id: insertedTelegramUser.id }, query: ALL_TELEGRAM_USER_FIELDS })

    // sure that fields are unencrypted
    expect(createdTelegramUser.dnevnikAccessToken).toBe(unencryptedDnevnikAccessToken)
    expect(createdTelegramUser.dnevnikRefreshToken).toBe(unencryptedDnevnikRefreshToken)

    // now update tokens
    const dnevnikAccessToken = faker.string.alphanumeric(20)
    const dnevnikRefreshToken = faker.string.alphanumeric(20)
    const updatedTelegramUser = await updateTestTelegramUser(context, insertedTelegramUser.id, { dnevnikAccessToken, dnevnikRefreshToken })

    // sure that decrypted tokens are same
    expect(updatedTelegramUser.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(updatedTelegramUser.dnevnikRefreshToken).toBe(dnevnikRefreshToken)

    // read data with skipped decryption
    // https://www.prisma.io/docs/orm/prisma-client/queries/crud#read
    const encrypted = await context.prisma.TelegramUser.findUnique({ where: { id: insertedTelegramUser.id } })

    // sure that loaded encrypted tokens are not the same as unencrypted ones
    expect(encrypted.dnevnikAccessToken).not.toBe(dnevnikAccessToken)
    expect(encrypted.dnevnikRefreshToken).not.toBe(dnevnikRefreshToken)

    // sure that these tokens encrypted right
    expect(dnevnikAccessToken).toBe(decrypt(encrypted.dnevnikAccessToken, String(process.env.TOKENS_ENCRYPTION_KEY)))
    expect(dnevnikRefreshToken).toBe(decrypt(encrypted.dnevnikRefreshToken, String(process.env.TOKENS_ENCRYPTION_KEY)))
  })
})

import type { Context as KeystoneContext } from './generated/keystone/types.js'
import { createTestGodContext, createTestMessengerUser, generateTestPlatformUserId, updateTestMessengerUser } from './testUtils/lists.test.utils.js'
import { faker } from "@faker-js/faker"
import { ALL_USER_FIELDS } from "./core/constants.js"
import { decrypt } from "./keystone/fields/encryptedText/utils.js"
import { config } from './config.js'
import { describe, beforeAll, test, expect } from "vitest"

describe('MessengerUser', () => {
  let context: KeystoneContext

  beforeAll(async () => {
    context = await createTestGodContext()
  })

  test('dnevnik tokens are null by default', async () => {
    const { obj: createdMessengerUser } = await createTestMessengerUser(context)

    expect(createdMessengerUser.dnevnikAccessToken).toBeNull()
    expect(createdMessengerUser.dnevnikRefreshToken).toBeNull()
  })

  test('dnevnik tokens can be set to string and back to null', async () => {
    const { obj: createdMessengerUser } = await createTestMessengerUser(context)

    expect(createdMessengerUser.dnevnikAccessToken).toBeNull()
    expect(createdMessengerUser.dnevnikRefreshToken).toBeNull()

    const dnevnikAccessToken = faker.string.alphanumeric(20)
    const dnevnikRefreshToken = faker.string.alphanumeric(20)

    const updatedMessengerUser1 = await updateTestMessengerUser(context, createdMessengerUser.id, { dnevnikAccessToken, dnevnikRefreshToken })

    expect(updatedMessengerUser1.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(updatedMessengerUser1.dnevnikRefreshToken).toBe(dnevnikRefreshToken)

    const updatedMessengerUser2 = await updateTestMessengerUser(context, createdMessengerUser.id, { dnevnikAccessToken: null, dnevnikRefreshToken: null })

    expect(updatedMessengerUser2.dnevnikAccessToken).toBeNull()
    expect(updatedMessengerUser2.dnevnikRefreshToken).toBeNull()
  })

  test('keep dnevnik tokens unchanged when update other fields', async () => {
    const dnevnikAccessToken = faker.string.alphanumeric(20)
    const dnevnikRefreshToken = faker.string.alphanumeric(20)

    const { obj: createdMessengerUser } = await createTestMessengerUser(context, { dnevnikAccessToken, dnevnikRefreshToken })

    expect(createdMessengerUser.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(createdMessengerUser.dnevnikRefreshToken).toBe(dnevnikRefreshToken)

    const updatedMessengerUser = await updateTestMessengerUser(context, createdMessengerUser.id, { dnevnikAccessTokenExpirationDate: faker.date.soon() })

    expect(updatedMessengerUser.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(updatedMessengerUser.dnevnikRefreshToken).toBe(dnevnikRefreshToken)
  })

  test('keep existing unencrypted data "as is" on reading and encrypt on update', async () => {
    const unencryptedDnevnikAccessToken = `unencrypted_${faker.string.alphanumeric(20)}`
    const unencryptedDnevnikRefreshToken = `unencrypted_${faker.string.alphanumeric(20)}`

    // insert data with skipping encryption
    const insertedMessengerUser = await context.prisma.messengerUser.create({
      data: {
        platform: 'telegram',
        platformUserId: generateTestPlatformUserId(),
        dnevnikAccessToken: unencryptedDnevnikAccessToken,
        dnevnikRefreshToken: unencryptedDnevnikRefreshToken,
      }
    })

    // sure that inserted fields are right
    expect(insertedMessengerUser.dnevnikAccessToken).toBe(unencryptedDnevnikAccessToken)
    expect(insertedMessengerUser.dnevnikRefreshToken).toBe(unencryptedDnevnikRefreshToken)

    // search user using encrypted field
    const createdMessengerUser = await context.query.MessengerUser.findOne({ where: { id: insertedMessengerUser.id }, query: ALL_USER_FIELDS })

    // sure that fields are unencrypted
    expect(createdMessengerUser['dnevnikAccessToken']).toBe(unencryptedDnevnikAccessToken)
    expect(createdMessengerUser['dnevnikRefreshToken']).toBe(unencryptedDnevnikRefreshToken)

    // now update tokens
    const dnevnikAccessToken = faker.string.alphanumeric(20)
    const dnevnikRefreshToken = faker.string.alphanumeric(20)
    const updatedMessengerUser = await updateTestMessengerUser(context, insertedMessengerUser.id, { dnevnikAccessToken, dnevnikRefreshToken })

    // sure that decrypted tokens are same
    expect(updatedMessengerUser.dnevnikAccessToken).toBe(dnevnikAccessToken)
    expect(updatedMessengerUser.dnevnikRefreshToken).toBe(dnevnikRefreshToken)

    // read data with skipped decryption
    // https://www.prisma.io/docs/orm/prisma-client/queries/crud#read
    const encrypted = await context.prisma.messengerUser.findUnique({ where: { id: insertedMessengerUser.id } })

    // sure that loaded encrypted tokens are not the same as unencrypted ones
    expect(encrypted?.dnevnikAccessToken).not.toBe(dnevnikAccessToken)
    expect(encrypted?.dnevnikRefreshToken).not.toBe(dnevnikRefreshToken)

    // sure that these tokens encrypted right
    expect(dnevnikAccessToken).toBe(decrypt(String(encrypted?.dnevnikAccessToken), config.tokensEncryptionKey))
    expect(dnevnikRefreshToken).toBe(decrypt(String(encrypted?.dnevnikRefreshToken), config.tokensEncryptionKey))
  })
})

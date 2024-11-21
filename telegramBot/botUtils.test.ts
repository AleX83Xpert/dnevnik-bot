import { KeystoneContext } from '@keystone-6/core/types'
import { createTelegramUser, cutToken, findTelegramUser } from './botUtils'
import { createTestGodContext } from '../testUtils/lists.test.utils'
import { faker } from '@faker-js/faker'

describe('botUtils', () => {
  let context: KeystoneContext

  beforeAll(async () => {
    context = await createTestGodContext()
  })

  test('createTelegramUser && findTelegramUser works fine', async () => {
    const telegramId = `test_fake_${faker.string.uuid()}`

    const createdTelegramUser = await createTelegramUser(context, telegramId, { a:1 })
    const foundTelegramUser = await findTelegramUser(context, telegramId)

    expect(createdTelegramUser.id).toBe(foundTelegramUser.id)
  })

  test('token should cut successfully', () => {
    expect(cutToken('')).toBe('...')
    expect(cutToken('abcdef')).toBe('abcdef...abcdef')
    expect(cutToken('abcdefghijklmnopqrstuvwxyz1234567890')).toBe('abcdefghij...1234567890')
  })
})

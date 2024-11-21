import { getContext } from '@keystone-6/core/context'
import * as PrismaModule from '.prisma/client'
import config from '../keystone'
import { Lists } from '.keystone/types'
import { KeystoneContext } from '@keystone-6/core/types'
import { ALL_TELEGRAM_USER_FIELDS } from '../telegramBot/constants/fields'
import { faker } from '@faker-js/faker'

export const createTestGodContext = async () => {
  return getContext(config, PrismaModule).sudo()
}

export async function createTestTelegramUser (context: KeystoneContext, attrs: Partial<Lists.TelegramUser.Item> = {}): Promise<{ data: Lists.TelegramUser.Item, obj: Lists.TelegramUser.Item }> {
  const data = {
    telegramId: `test_fake_${faker.string.uuid()}`,
    ...attrs,
  } as Lists.TelegramUser.Item

  const obj = await context.query.TelegramUser.createOne({
    data,
    query: ALL_TELEGRAM_USER_FIELDS,
  }) as Lists.TelegramUser.Item

  return { data, obj }
}

export async function updateTestTelegramUser(context: KeystoneContext, id: string, data: Partial<Lists.TelegramUser.Item> = {}): Promise<Lists.TelegramUser.Item> {
  return await context.query.TelegramUser.updateOne({
    where: { id },
    data,
    query: ALL_TELEGRAM_USER_FIELDS,
  }) as Lists.TelegramUser.Item
}

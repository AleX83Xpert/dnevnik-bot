import { getContext } from '@keystone-6/core/context'
import * as PrismaModule from '.prisma/client'
import config from '../keystone'
import { Lists } from '.keystone/types'
import { KeystoneContext } from '@keystone-6/core/types'
import { ALL_USER_FIELDS } from '../core/constants'
import { faker } from '@faker-js/faker'

export const createTestGodContext = async () => {
  return getContext(config, PrismaModule).sudo()
}

export function generateTestPlatformUserId () {
  return `test_fake_${faker.string.uuid()}`
}

export async function createTestMessengerUser (context: KeystoneContext, attrs: Partial<Lists.MessengerUser.Item> = {}): Promise<{ data: Lists.MessengerUser.Item, obj: Lists.MessengerUser.Item }> {
  const data = {
    platform: 'telegram',
    platformUserId: generateTestPlatformUserId(),
    ...attrs,
  } as Lists.MessengerUser.Item

  const obj = await context.query.MessengerUser.createOne({
    data,
    query: ALL_USER_FIELDS,
  }) as Lists.MessengerUser.Item

  return { data, obj }
}

export async function updateTestMessengerUser(context: KeystoneContext, id: string, data: Partial<Lists.MessengerUser.Item> = {}): Promise<Lists.MessengerUser.Item> {
  return await context.query.MessengerUser.updateOne({
    where: { id },
    data,
    query: ALL_USER_FIELDS,
  }) as Lists.MessengerUser.Item
}

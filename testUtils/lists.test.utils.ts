import { getContext } from '@keystone-6/core/context'
import * as PrismaModule from '.prisma/client'
import config from '../keystone.js'
import type { Lists } from '../generated/keystone/types.js'
import type { Context as KeystoneContext } from '../generated/keystone/types.js'
import { ALL_USER_FIELDS } from '../core/constants.js'
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

export async function createTestUser(context: KeystoneContext, attrs: Partial<Lists.User.Item> = {}): Promise<Lists.User.Item> {
  const data = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    isAdmin: false,
    ...attrs,
  } as Lists.User.Item

  return await context.query.User.createOne({
    data,
    query: 'id name email password isAdmin createdAt updatedAt',
  }) as Lists.User.Item
}

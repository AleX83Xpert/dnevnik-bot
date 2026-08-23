import type { KeystoneContext } from '@keystone-6/core/types'
import { ALL_USER_FIELDS } from './constants.js'
import type { MessengerUser } from './types.js'

export async function findUser(
  godContext: KeystoneContext,
  platform: string,
  platformUserId: string
): Promise<MessengerUser | undefined> {
  const users = await godContext.query.MessengerUser.findMany({
    where: { platform: { equals: platform }, platformUserId: { equals: platformUserId } },
    query: ALL_USER_FIELDS,
  })
  return users[0] as MessengerUser | undefined
}

export async function findOrCreateUser(
  godContext: KeystoneContext,
  platform: string,
  platformUserId: string,
  meta: unknown
): Promise<MessengerUser> {
  let user = await findUser(godContext, platform, platformUserId)
  if (!user) {
    user = await godContext.query.MessengerUser.createOne({
      data: { platform, platformUserId, meta },
      query: ALL_USER_FIELDS,
    }) as MessengerUser
  }
  return user
}

export async function updateUserTokens(
  godContext: KeystoneContext,
  userId: string,
  tokens: { accessToken: string; accessTokenExpirationDate: string; refreshToken: string }
): Promise<MessengerUser> {
  return await godContext.query.MessengerUser.updateOne({
    where: { id: userId },
    data: {
      dnevnikAccessToken: tokens.accessToken,
      dnevnikAccessTokenExpirationDate: tokens.accessTokenExpirationDate,
      dnevnikRefreshToken: tokens.refreshToken,
      dnevnikTokensUpdatedAt: new Date().toISOString(),
    },
    query: ALL_USER_FIELDS,
  }) as MessengerUser
}

export async function clearUserTokens(
  godContext: KeystoneContext,
  userId: string
): Promise<void> {
  await godContext.query.MessengerUser.updateOne({
    where: { id: userId },
    data: {
      dnevnikAccessToken: null,
      dnevnikAccessTokenExpirationDate: null,
      dnevnikRefreshToken: null,
      dnevnikTokensUpdatedAt: null,
    },
  })
}

export async function findExpiringUsers(
  godContext: KeystoneContext,
  expiresBefore: string
): Promise<MessengerUser[]> {
  return await godContext.query.MessengerUser.findMany({
    where: {
      dnevnikAccessTokenExpirationDate: { lte: expiresBefore },
      dnevnikAccessToken: { not: { equals: '' } },
      dnevnikRefreshToken: { not: { equals: '' } },
    },
    query: ALL_USER_FIELDS,
  }) as MessengerUser[]
}

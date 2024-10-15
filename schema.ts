import { list, group, graphql } from '@keystone-6/core'

import {
  text,
  json,
  checkbox,
  password,
  timestamp,
  virtual,
} from '@keystone-6/core/fields'

import { type Lists } from '.keystone/types'

import get from 'lodash/get'
import dayjs from 'dayjs'

type TSession = {
  data: {
    id: string;
    isAdmin: boolean;
  }
}

type TUserData = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

const isAdmin = ({ session }: { session?: TSession }) => Boolean(session?.data.isAdmin)
const isOwner = ({ session, item }: { session: TSession, item: TUserData }) => session?.data.id === item.id

export const lists = {
  User: list({
    access: isAdmin,
    description: 'The web site user',
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
      }),
      password: password({ validation: { isRequired: true } }),
      isAdmin: checkbox(),
      createdAt: timestamp({ defaultValue: { kind: 'now' } }),
      updatedAt: timestamp({ defaultValue: { kind: 'now' } }),
    },
    hooks: {
      resolveInput ({ resolvedData }) {
        resolvedData.updatedAt = dayjs().toISOString()
        return resolvedData
      },
    },
  }),

  TelegramUser: list({
    access: isAdmin,
    fields: {
      label: virtual({
        field: graphql.field({
          type: graphql.String,
          async resolve (item, args, context) {
            const telegramId = get(item, ['meta', 'id'])
            const title = get(item, ['meta', 'username'], get(item, ['meta', 'first_name']))

            return title ? `${title}/${telegramId}` : item.id
          }
        }),
      }),
      telegramId: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
      }),
      ...group({
        label: 'Dnevnik token set',
        fields: {
          isTokenActual: virtual({
            field: graphql.field({
              type: graphql.Boolean,
              async resolve (item, args, context) {
                return dayjs().isBefore(item.dnevnikAccessTokenExpirationDate)
              },
            }),
          }),
          dnevnikAccessToken: text({ validation: { isRequired: false }, ui: {} }),
          dnevnikAccessTokenExpirationDate: timestamp({ validation: { isRequired: false }, isOrderable: true, isIndexed: true }),
          dnevnikRefreshToken: text({ validation: { isRequired: false } }),
          dnevnikTokensUpdatedAt: timestamp({ validation: { isRequired: false }, isOrderable: true, isIndexed: true }),
        },
      }),
      isBlocked: checkbox({ defaultValue: false }),
      meta: json(),
      createdAt: timestamp({ defaultValue: { kind: 'now' } }),
      updatedAt: timestamp({ defaultValue: { kind: 'now' } }),
    },
    hooks: {
      resolveInput ({ resolvedData }) {
        resolvedData.updatedAt = dayjs().toISOString()
        return resolvedData
      },
    },
  }),
} satisfies Lists

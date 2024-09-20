import { list, group } from '@keystone-6/core'

import {
  text,
  json,
  checkbox,
  password,
  timestamp,
} from '@keystone-6/core/fields'

import { type Lists } from '.keystone/types'

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
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
    },
  }),

  TelegramUser: list({
    access: isAdmin,
    fields: {
      telegramId: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
      }),
      meta: json(),
      ...group({
        label: 'Dnevnik token set',
        fields: {
          dnevnikAccessToken: text({ validation: { isRequired: false }, ui: {} }),
          dnevnikAccessTokenExpirationDate: timestamp({ validation: { isRequired: false }, isOrderable: true, isIndexed: true }),
          dnevnikRefreshToken: text({ validation: { isRequired: false } }),
          dnevnikTokensUpdatedAt: timestamp({ validation: { isRequired: false }, isOrderable: true, isIndexed: true }),
        },
      }),
      createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    },
  }),
} satisfies Lists

import {
  type BaseListTypeInfo,
  fieldType,
  type FieldTypeFunc,
  orderDirectionEnum,
} from '@keystone-6/core/types'
import { g } from '@keystone-6/core'
import type { TextFieldConfig } from '@keystone-6/core/fields'
import type { GInputObjectType, GArg } from '@graphql-ts/schema'
import { decrypt, encrypt } from './utils.js'
import { isNil } from 'lodash'

type EncryptedTextFieldConfig<ListTypeInfo extends BaseListTypeInfo> = TextFieldConfig<ListTypeInfo> & {
  secretKey: string
}

type EncryptedTextFilterType = GInputObjectType<{
  equals: GArg<typeof g.String>
  not: GArg<EncryptedTextFilterType>
}>

const encryptedTextFilter: EncryptedTextFilterType = g.inputObject({
  name: 'EncryptedTextFilter',
  fields: () => ({
    equals: g.arg({ type: g.String }),
    not: g.arg({ type: encryptedTextFilter }),
  }),
})

export function encryptedText<ListTypeInfo extends BaseListTypeInfo> ({
  secretKey,
  ...config
}: EncryptedTextFieldConfig<ListTypeInfo> = { secretKey: '' }): FieldTypeFunc<ListTypeInfo> {
  if (!secretKey || secretKey === '') {
    throw new Error('Secret key is required for encryptedText')
  }

  const {
    validation = {}
  } = config

  config.db ??= {}
  config.db.isNullable ??= false

  const isRequired = validation.isRequired ?? false

  return (meta) => {
    const isNullable = config.db?.isNullable ?? false

    return fieldType({
      kind: 'scalar',
      mode: isRequired ? 'required' : 'optional',
      scalar: 'String',
      index: undefined,
      map: config.db?.map,
      nativeType: config.db?.nativeType,
      extendPrismaSchema: config.db?.extendPrismaSchema,
    })({
      ...config,
      input: {
        where: {
          arg: g.arg({
            type: encryptedTextFilter,
          }),
        },
        create: {
          arg: g.arg({
            type: g.String,
          }),
          resolve (value, context) {
            try {
              return isNil(value) ? value : encrypt(value, secretKey)
            } catch (err) {
              return value
            }
          },
        },
        update: {
          arg: g.arg({ type: g.String }),
          resolve (value, context) {
            try {
              return isNil(value) ? value : encrypt(value, secretKey)
            } catch (err) {
              return value
            }
          },
        },
        orderBy: { arg: g.arg({ type: orderDirectionEnum }) },
      },
      output: g.field({
        type: g.String,
        resolve ({ value, item }, args, context, info) {
          try {
            return value ? decrypt(value, secretKey) : undefined
          } catch (err) {
            return value
          }
        },
      }),
      views: './keystone/fields/encryptedText/views',
      getAdminMeta () {
        return {
          displayMode: config.ui?.displayMode ?? 'input',
          shouldUseModeInsensitive: meta.provider === 'postgresql',
          validation: { isRequired },
          isNullable,
        }
      },
    })
  }
}

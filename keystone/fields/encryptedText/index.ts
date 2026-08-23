import {
  type BaseListTypeInfo,
  fieldType,
  type FieldTypeFunc,
  orderDirectionEnum,
} from '@keystone-6/core/types'
import { graphql } from '@keystone-6/core'
import type { TextFieldConfig } from '@keystone-6/core/fields'
import { decrypt, encrypt } from './utils.js'
import { isNil } from 'lodash'

type EncryptedTextFieldConfig<ListTypeInfo extends BaseListTypeInfo> = TextFieldConfig<ListTypeInfo> & {
  secretKey: string
}

type EncryptedTextFilterFilterType = graphql.InputObjectType<{
  equals: graphql.Arg<typeof graphql.String>
  not: graphql.Arg<EncryptedTextFilterFilterType>
}>

const encryptedTextFilter: EncryptedTextFilterFilterType = graphql.inputObject({
  name: 'EncryptedTextFilter',
  fields: () => ({
    equals: graphql.arg({ type: graphql.String }),
    not: graphql.arg({ type: encryptedTextFilter }),
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
          arg: graphql.arg({
            type: encryptedTextFilter,
          }),
        },
        create: {
          arg: graphql.arg({
            type: graphql.String,
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
          arg: graphql.arg({ type: graphql.String }),
          resolve (value, context) {
            try {
              return isNil(value) ? value : encrypt(value, secretKey)
            } catch (err) {
              return value
            }
          },
        },
        orderBy: { arg: graphql.arg({ type: orderDirectionEnum }) },
      },
      output: graphql.field({
        type: graphql.String,
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

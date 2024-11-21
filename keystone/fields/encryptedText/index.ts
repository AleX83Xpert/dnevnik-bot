import {
  type BaseListTypeInfo,
  fieldType,
  type FieldTypeFunc,
  orderDirectionEnum,
  QueryMode,
} from '@keystone-6/core/types'
import { graphql } from '@keystone-6/core'
import { TextFieldConfig } from '@keystone-6/core/fields'
import { decrypt, encrypt } from './utils'
import { isNil } from 'lodash'

type EncryptedTextFieldConfig<ListTypeInfo extends BaseListTypeInfo> = TextFieldConfig<ListTypeInfo> & {
  secretKey: string
}

type EncryptedTextFilterFilterType = graphql.InputObjectType<{
  equals: graphql.Arg<typeof graphql.String> // can be null
  not: graphql.Arg<EncryptedTextFilterFilterType> // can be null
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
    // defaultValue: defaultValue_,
    validation = {}
  } = config

  config.db ??= {}
  config.db.isNullable ??= false

  const isRequired = validation.isRequired ?? false

  return (meta) => {
    const isNullable = config.db?.isNullable ?? false
    // const defaultValue = isNullable ? (defaultValue_ ?? null) : (defaultValue_ ?? '')

    return fieldType({
      kind: 'scalar',
      mode: isRequired ? 'required' : 'optional',
      scalar: 'String',
      // default: (defaultValue === null) ? undefined : { kind: 'literal', value: defaultValue },
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
            return value // backward compatibility: not encrypted text will return as is
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

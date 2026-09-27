import React from 'react'
import { TextField } from '@keystar/ui/text-field'
import { CellContainer } from '@keystone-6/core/admin-ui/components'

import {
  type CellComponent,
  type FieldController,
  type FieldControllerConfig,
  type FieldProps,
} from '@keystone-6/core/types'

type CardValueProps = {
  field: ReturnType<typeof controller>
  item: Record<string, unknown>
}

export const CardValue: React.FC<CardValueProps> = ({ field, item }) => {
  return (
    <div>
      <label>{field.label}</label>
      {item[field.fieldKey] as string}
    </div>
  )
}

export const Cell: CellComponent = ({ value, field, item }) => {
  const displayValue = value + ''
  return <CellContainer>{displayValue}</CellContainer>
}

export function Field ({ field, value, onChange, autoFocus }: FieldProps<typeof controller>) {
  const disabled = onChange === undefined

  return (
    <TextField
      autoFocus={autoFocus}
      description={field.description}
      label={field.label}
      isDisabled={disabled}
      onChange={x => onChange?.(x === '' ? null : x)}
      value={value ?? ''}
    />
  )
}

export const controller = (
  config: FieldControllerConfig<{}>
): FieldController<string | null, string> => {
  return {
    fieldKey: config.fieldKey,
    label: config.label,
    description: config.description,
    defaultValue: null,
    deserialize: data => {
      const value = data[config.fieldKey]
      return typeof value === 'string' ? value : null
    },
    serialize: value => ({ [config.fieldKey]: value }),
    graphqlSelection: config.fieldKey,
  }
}

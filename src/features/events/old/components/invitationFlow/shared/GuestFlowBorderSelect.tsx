import { Select } from 'antd'
import type { ReactNode } from 'react'
import '../../blocks/mpPayment/eventGuestFlowFields.css'

type Option = {
  value: number | string
  label: ReactNode
}

type Props = {
  label: string
  required?: boolean
  value?: number | string
  onChange?: (value: number) => void
  options: Option[]
  placeholder?: string
  hasError?: boolean
  loading?: boolean
  disabled?: boolean
  id?: string
}

export function GuestFlowBorderSelect({
  label,
  required = false,
  value,
  onChange,
  options,
  placeholder,
  hasError = false,
  loading = false,
  disabled = false,
  id,
}: Props) {
  return (
    <fieldset
      className={`guest-flow-field${hasError ? ' guest-flow-field--error' : ''}`}
    >
      <legend className="guest-flow-field-legend">
        {label}
        {required ? <span className="guest-flow-field-required"> *</span> : null}
      </legend>
      <Select
        id={id}
        size="large"
        variant="borderless"
        className="guest-flow-field-select"
        loading={loading}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        options={options}
        onChange={(next) => onChange?.(Number(next))}
      />
    </fieldset>
  )
}

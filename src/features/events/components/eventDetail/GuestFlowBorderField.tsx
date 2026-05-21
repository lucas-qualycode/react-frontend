import { Input } from 'antd'
import type { ChangeEventHandler } from 'react'
import './eventGuestFlowFields.css'

const { TextArea } = Input

type Props = {
  label: string
  required?: boolean
  value?: string
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  placeholder?: string
  hasError?: boolean
  status?: '' | 'error' | 'warning'
  id?: string
  multiline?: boolean
  rows?: number
  maxLength?: number
  showCount?: boolean
  type?: string
  autoComplete?: string
}

export function GuestFlowBorderField({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  hasError: hasErrorProp = false,
  status,
  id,
  multiline = false,
  rows = 4,
  maxLength,
  showCount = false,
  type,
  autoComplete,
}: Props) {
  const hasError = hasErrorProp || status === 'error'

  return (
    <fieldset
      className={`guest-flow-field${hasError ? ' guest-flow-field--error' : ''}`}
    >
      <legend className="guest-flow-field-legend">
        {label}
        {required ? <span className="guest-flow-field-required"> *</span> : null}
      </legend>
      {multiline ? (
        <div className="guest-flow-field-textarea-wrap">
          <TextArea
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            showCount={showCount}
            variant="borderless"
            className="guest-flow-field-input"
            style={{ resize: 'vertical' }}
          />
        </div>
      ) : (
        <Input
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          variant="borderless"
          className="guest-flow-field-input"
        />
      )}
    </fieldset>
  )
}

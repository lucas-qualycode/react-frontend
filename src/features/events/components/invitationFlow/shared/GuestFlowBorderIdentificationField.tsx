import { Input, Select, Space } from 'antd'
import '../../blocks/mpPayment/eventGuestFlowFields.css'

type DocTypeOption = {
  value: string
  label: string
}

type Props = {
  label: string
  required?: boolean
  docType: string
  docNumber: string
  docTypeOptions: DocTypeOption[]
  onDocTypeChange: (type: string) => void
  onDocNumberChange: (number: string) => void
  numberPlaceholder?: string
  hasError?: boolean
  id?: string
}

export function GuestFlowBorderIdentificationField({
  label,
  required = false,
  docType,
  docNumber,
  docTypeOptions,
  onDocTypeChange,
  onDocNumberChange,
  numberPlaceholder,
  hasError = false,
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
      <Space.Compact className="guest-flow-field-identification-compact">
        <Select
          size="large"
          value={docType || undefined}
          options={docTypeOptions}
          onChange={onDocTypeChange}
          variant="borderless"
          className="guest-flow-field-identification-type"
          popupMatchSelectWidth={false}
        />
        <Input
          id={id}
          size="large"
          value={docNumber}
          onChange={(e) => onDocNumberChange(e.target.value)}
          placeholder={numberPlaceholder}
          inputMode="numeric"
          variant="borderless"
          className="guest-flow-field-input guest-flow-field-identification-number"
        />
      </Space.Compact>
    </fieldset>
  )
}

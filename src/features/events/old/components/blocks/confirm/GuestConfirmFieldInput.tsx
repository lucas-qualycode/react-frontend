import { useTranslation } from 'react-i18next'
import type { FieldDefinition } from '@/shared/types/api'
import {
  fieldDefinitionById,
  formatGuestFieldInput,
  guestFieldInputMode,
  guestFieldPlaceholderKey,
  guestFieldValidationMessageKey,
  getGuestFieldValidationErrorKey,
} from '../../invitationFlow/lib/guestConfirmFieldUtils'
import { GuestConfirmBorderField } from './GuestConfirmBorderField'

type Props = {
  fieldId: string
  fieldDefinitions: FieldDefinition[]
  value: string
  required?: boolean
  hasMissingError?: boolean
  showValidation?: boolean
  onChange: (value: string) => void
}

export function GuestConfirmFieldInput({
  fieldId,
  fieldDefinitions,
  value,
  required = false,
  hasMissingError = false,
  showValidation = false,
  onChange,
}: Props) {
  const { t } = useTranslation()
  const definition = fieldDefinitionById(fieldId, fieldDefinitions)
  if (!definition) {
    return (
      <GuestConfirmBorderField
        label={fieldId}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('events.detail.guestConfirm.fieldPlaceholder')}
        hasError={hasMissingError}
      />
    )
  }

  const placeholderKey = guestFieldPlaceholderKey(definition)
  const placeholder = placeholderKey
    ? t(placeholderKey)
    : t('events.detail.guestConfirm.fieldPlaceholder')

  const validationErrorKey =
    showValidation && value.trim()
      ? getGuestFieldValidationErrorKey(definition, value)
      : hasMissingError
        ? ('required' as const)
        : null

  const hasError = hasMissingError || validationErrorKey !== null
  const errorMessage =
    validationErrorKey !== null
      ? t(guestFieldValidationMessageKey(validationErrorKey), {
          label: definition.label,
        })
      : undefined

  return (
    <GuestConfirmBorderField
      label={definition.label}
      required={required}
      value={value}
      onChange={(event) => onChange(formatGuestFieldInput(definition, event.target.value))}
      placeholder={placeholder}
      hasError={hasError}
      errorMessage={errorMessage}
      inputMode={guestFieldInputMode(definition)}
      autoComplete={guestFieldInputMode(definition) === 'email' ? 'email' : undefined}
    />
  )
}

import type { FieldDefinition } from '@/shared/types/api'

export type GuestConfirmFieldKind =
  | 'cpf'
  | 'email'
  | 'phone'
  | 'age'
  | 'birth_date'
  | 'full_name'
  | 'text'

const DEFAULT_GUEST_FIELD_LABEL_KEYS = new Set([
  'full_name',
  'cpf',
  'email',
  'phone',
  'age',
  'birth_date',
])

export function fieldDefinitionById(
  fieldId: string,
  definitions: FieldDefinition[],
): FieldDefinition | undefined {
  return definitions.find((row) => row.id === fieldId)
}

export function guestFieldLabelTranslationKey(definition: FieldDefinition): string | null {
  const key = definition.key.trim().toLowerCase()
  if (!DEFAULT_GUEST_FIELD_LABEL_KEYS.has(key)) return null
  return `events.detail.guestConfirm.fieldLabels.${key}`
}

export function resolveGuestFieldLabel(
  definition: FieldDefinition | undefined,
  fieldId: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!definition) return fieldId
  const translationKey = guestFieldLabelTranslationKey(definition)
  if (translationKey) return t(translationKey)
  return definition.label?.trim() || fieldId
}

export function resolveGuestFieldKind(definition: FieldDefinition): GuestConfirmFieldKind {
  const format = (definition.format ?? '').trim().toLowerCase()
  const key = definition.key.trim().toLowerCase()
  const fieldType = definition.field_type.trim().toLowerCase()

  if (format === 'full_name' || key === 'full_name') return 'full_name'
  if (format === 'cpf' || key === 'cpf') return 'cpf'
  if (format === 'email' || key === 'email') return 'email'
  if (format === 'phone' || key === 'phone') return 'phone'
  if (format === 'birth_date' || key === 'birth_date') return 'birth_date'
  if (fieldType === 'number' || key === 'age' || format === 'number') return 'age'
  return 'text'
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCpfInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatPhoneInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function formatBirthDateInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function formatAgeInput(value: string): string {
  return digitsOnly(value).slice(0, 3)
}

export function isValidCpf(value: string): boolean {
  const digits = digitsOnly(value)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calcCheckDigit = (sliceLength: number): number => {
    let sum = 0
    for (let index = 0; index < sliceLength; index += 1) {
      sum += Number(digits[index]) * (sliceLength + 1 - index)
    }
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return calcCheckDigit(9) === Number(digits[9]) && calcCheckDigit(10) === Number(digits[10])
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  const digits = digitsOnly(value)
  return digits.length >= 10 && digits.length <= 11
}

export function isValidAge(value: string, definition: FieldDefinition): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (!/^\d+$/.test(trimmed)) return false
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) return false
  const minimum = definition.minimum ?? 0
  if (parsed < minimum) return false
  if (definition.maximum != null && parsed > definition.maximum) return false
  return parsed <= 130
}

function parseBirthDateParts(value: string): { day: number; month: number; year: number } | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const day = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const year = Number.parseInt(match[3], 10)
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
  return { day, month, year }
}

export function isValidBirthDate(value: string): boolean {
  const parts = parseBirthDateParts(value)
  if (!parts) return false
  const { day, month, year } = parts
  if (month < 1 || month > 12 || day < 1 || year < 1900) return false

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export type GuestFieldValidationErrorKey =
  | 'cpfInvalid'
  | 'emailInvalid'
  | 'phoneInvalid'
  | 'ageInvalid'
  | 'birthDateInvalid'
  | 'required'

export function getGuestFieldValidationErrorKey(
  definition: FieldDefinition,
  value: string,
): GuestFieldValidationErrorKey | null {
  const trimmed = value.trim()
  if (!trimmed) return 'required'

  const kind = resolveGuestFieldKind(definition)
  switch (kind) {
    case 'cpf':
      return isValidCpf(trimmed) ? null : 'cpfInvalid'
    case 'email':
      return isValidEmail(trimmed) ? null : 'emailInvalid'
    case 'phone':
      return isValidPhone(trimmed) ? null : 'phoneInvalid'
    case 'age':
      return isValidAge(trimmed, definition) ? null : 'ageInvalid'
    case 'birth_date':
      return isValidBirthDate(trimmed) ? null : 'birthDateInvalid'
    default:
      return null
  }
}

export function formatGuestFieldInput(definition: FieldDefinition, value: string): string {
  const kind = resolveGuestFieldKind(definition)
  switch (kind) {
    case 'cpf':
      return formatCpfInput(value)
    case 'phone':
      return formatPhoneInput(value)
    case 'birth_date':
      return formatBirthDateInput(value)
    case 'age':
      return formatAgeInput(value)
    default:
      return value
  }
}

export function guestFieldPlaceholderKey(definition: FieldDefinition): string | null {
  const kind = resolveGuestFieldKind(definition)
  switch (kind) {
    case 'cpf':
      return 'events.detail.guestConfirm.fieldPlaceholderCpf'
    case 'email':
      return 'events.detail.guestConfirm.fieldPlaceholderEmail'
    case 'phone':
      return 'events.detail.guestConfirm.fieldPlaceholderPhone'
    case 'age':
      return 'events.detail.guestConfirm.fieldPlaceholderAge'
    case 'birth_date':
      return 'events.detail.guestConfirm.fieldPlaceholderBirthDate'
    case 'full_name':
      return 'events.detail.guestConfirm.fieldPlaceholderFullName'
    default:
      return null
  }
}

export function guestFieldInputMode(
  definition: FieldDefinition,
): 'text' | 'numeric' | 'tel' | 'email' | undefined {
  const kind = resolveGuestFieldKind(definition)
  switch (kind) {
    case 'cpf':
    case 'age':
    case 'birth_date':
      return 'numeric'
    case 'phone':
      return 'tel'
    case 'email':
      return 'email'
    default:
      return undefined
  }
}

export function guestFieldValidationMessageKey(errorKey: GuestFieldValidationErrorKey): string {
  return `events.detail.guestConfirm.validation.${errorKey}`
}

import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import {
  getCardNumberMaxLength,
  inferCardBrandFromDigits,
  isValidCardNumber,
  resolveCardBrandForCardNumber,
} from './guestCardBrand'
import {
  buildCardMpOrderBodyFromToken,
  buildPixMpOrderBody,
  type GuestCardPaymentPersisted,
  type GuestMpCardTokenResult,
  type GuestMpPaymentSnapshot,
  type GuestMpPixPayer,
  type MpCreateOrderBody,
} from './guestMpPaymentDraft'

export type GuestCardPaymentSecrets = {
  cardNumber: string
  securityCode: string
}

export type GuestCardPaymentFormState = GuestCardPaymentPersisted & GuestCardPaymentSecrets

export function createDefaultCardPaymentSecrets(): GuestCardPaymentSecrets {
  return {
    cardNumber: '',
    securityCode: '',
  }
}

export function cardBin(cardNumber: string): string {
  return cardNumber.replace(/\D/g, '').slice(0, 6)
}

export function normalizeCardNumber(cardNumber: string): string {
  return cardNumber.replace(/\D/g, '')
}

export function clampCardNumber(
  cardNumber: string,
  paymentMethodId: string | undefined = '',
): string {
  const digits = normalizeCardNumber(cardNumber)
  return digits.slice(0, getCardNumberMaxLength(paymentMethodId, digits))
}

export function formatCardNumberDisplay(
  cardNumber: string,
  paymentMethodId: string | undefined = '',
): string {
  const digits = clampCardNumber(cardNumber, paymentMethodId)
  const brand = resolveCardBrandForCardNumber(paymentMethodId, digits)
  if (brand === 'amex' || inferCardBrandFromDigits(digits) === 'amex') {
    const part1 = digits.slice(0, 4)
    const part2 = digits.slice(4, 10)
    const part3 = digits.slice(10, 15)
    return [part1, part2, part3].filter(Boolean).join(' ')
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function formatCardExpiryDisplay(month: string, year: string): string {
  const mm = month.replace(/\D/g, '').slice(0, 2)
  const yy = year.replace(/\D/g, '').slice(2, 4)
  if (!mm && !yy) return ''
  if (yy.length === 0) return mm
  return `${mm}/${yy}`
}

export function parseCardExpiryInput(value: string): {
  expirationMonth: string
  expirationYear: string
} {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  const expirationMonth = digits.slice(0, 2)
  const yearPart = digits.slice(2)
  const expirationYear =
    yearPart.length <= 2 ? (yearPart.length > 0 ? `20${yearPart}` : '') : yearPart.slice(0, 4)
  return { expirationMonth, expirationYear }
}

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export const GUEST_IDENTIFICATION_DOC_TYPES = [
  { id: 'CPF', name: 'CPF' },
  { id: 'CNPJ', name: 'CNPJ' },
] as const

export function identificationMaxLength(type: string): number {
  return type.toUpperCase() === 'CNPJ' ? 14 : 11
}

export function normalizeIdentificationNumber(value: string, type: string): string {
  return normalizeCpf(value).slice(0, identificationMaxLength(type))
}

export function identificationPlaceholder(type: string): string {
  return type.toUpperCase() === 'CNPJ' ? '00000000000000' : '00000000000'
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value)
  return digits.length === 11
}

export function isValidIdentification(type: string, value: string): boolean {
  const digits = normalizeCpf(value)
  return digits.length === identificationMaxLength(type)
}

export function mergeIdentificationDocTypes(
  mpTypes: Array<{ id: string; name: string }>,
): Array<{ id: string; name: string }> {
  const byId = new Map<string, string>()
  for (const docType of GUEST_IDENTIFICATION_DOC_TYPES) {
    byId.set(docType.id, docType.name)
  }
  for (const docType of mpTypes) {
    const id = docType.id.toUpperCase()
    if (id === 'CPF' || id === 'CNPJ') {
      byId.set(id, docType.name || id)
    }
  }
  return Array.from(byId.entries()).map(([id, name]) => ({ id, name }))
}

export function buildCardPaymentSnapshot(
  persisted: GuestCardPaymentPersisted,
): GuestMpPaymentSnapshot {
  return { method: 'card', card: persisted }
}

export function buildPixPaymentSnapshot(payer: GuestMpPixPayer): GuestMpPaymentSnapshot {
  return { method: 'pix', payer }
}

export function buildPixOrderFromSnapshot(
  checkout: GuestCheckoutSnapshot,
  snapshot: GuestMpPaymentSnapshot & { method: 'pix' },
): MpCreateOrderBody {
  return buildPixMpOrderBody(checkout, snapshot.payer)
}

export function buildCardOrderFromSnapshot(
  checkout: GuestCheckoutSnapshot,
  snapshot: GuestMpPaymentSnapshot & { method: 'card' },
  token: GuestMpCardTokenResult,
): MpCreateOrderBody {
  return buildCardMpOrderBodyFromToken(checkout, snapshot.card, token)
}

export type CardFormValidation = {
  valid: boolean
  fieldErrors: Partial<Record<keyof GuestCardPaymentFormState, string>>
}

export function validateCardPaymentForm(
  form: GuestCardPaymentFormState,
  t: (key: string) => string,
  options?: { requirePaymentMethod?: boolean },
): CardFormValidation {
  const requirePaymentMethod = options?.requirePaymentMethod ?? true
  const fieldErrors: CardFormValidation['fieldErrors'] = {}
  const require = (key: keyof GuestCardPaymentFormState, message: string) => {
    fieldErrors[key] = message
  }

  if (!form.cardholderName.trim()) {
    require('cardholderName', t('events.detail.guestMpPayment.validation.required'))
  }

  if (!form.payerEmail.trim()) {
    require('payerEmail', t('events.detail.guestMpPayment.validation.required'))
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.payerEmail.trim())) {
    require('payerEmail', t('events.detail.guestMpPayment.validation.emailInvalid'))
  }

  const cardNumber = clampCardNumber(form.cardNumber, form.paymentMethodId)
  if (!isValidCardNumber(cardNumber, form.paymentMethodId)) {
    require('cardNumber', t('events.detail.guestMpPayment.validation.cardNumberInvalid'))
  }

  if (!form.securityCode.trim() || form.securityCode.trim().length < 3) {
    require('securityCode', t('events.detail.guestMpPayment.validation.required'))
  }

  if (!/^\d{2}$/.test(form.expirationMonth)) {
    require('expirationMonth', t('events.detail.guestMpPayment.validation.expirationInvalid'))
  }

  if (!/^\d{4}$/.test(form.expirationYear)) {
    require('expirationYear', t('events.detail.guestMpPayment.validation.expirationInvalid'))
  }

  if (!form.identificationType.trim()) {
    require('identificationType', t('events.detail.guestMpPayment.validation.required'))
  }

  if (!isValidIdentification(form.identificationType, form.identificationNumber)) {
    const messageKey =
      form.identificationType.toUpperCase() === 'CNPJ'
        ? 'events.detail.guestMpPayment.validation.cnpjInvalid'
        : 'events.detail.guestMpPayment.validation.cpfInvalid'
    require('identificationNumber', t(messageKey))
  }

  if (requirePaymentMethod && !form.paymentMethodId.trim()) {
    require('paymentMethodId', t('events.detail.guestMpPayment.validation.paymentMethodPending'))
  }

  if (form.installments < 1) {
    require('installments', t('events.detail.guestMpPayment.validation.required'))
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors }
}

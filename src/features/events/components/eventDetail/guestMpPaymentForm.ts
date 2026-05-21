import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
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

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value)
  return digits.length === 11
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

  const cardNumber = normalizeCardNumber(form.cardNumber)
  if (cardNumber.length < 13) {
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

  if (!isValidCpf(form.identificationNumber)) {
    require('identificationNumber', t('events.detail.guestMpPayment.validation.cpfInvalid'))
  }

  if (requirePaymentMethod && !form.paymentMethodId.trim()) {
    require('paymentMethodId', t('events.detail.guestMpPayment.validation.paymentMethodPending'))
  }

  if (form.installments < 1) {
    require('installments', t('events.detail.guestMpPayment.validation.required'))
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors }
}

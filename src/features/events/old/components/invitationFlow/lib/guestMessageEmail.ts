import type { TFunction } from 'i18next'
import { message } from 'antd'
import type { GuestMessagePhase, GuestPaymentMethodChoice } from './guestFlowDraft'
import type { GuestCardPaymentPersisted } from '../../blocks/mpPayment/guestMpPaymentDraft'
import type { GuestPaymentSnapshot } from '../../blocks/payment/types'

export function isValidGuestEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function resolveGiftCapturedEmailFromSnapshot(snapshot: GuestPaymentSnapshot): string {
  if (snapshot.method === 'pix') {
    const email = snapshot.payer.email.trim()
    return isValidGuestEmail(email) ? email : ''
  }
  const email = snapshot.card.payerEmail.trim()
  return isValidGuestEmail(email) ? email : ''
}

export function resolveGiftCapturedEmail(input: {
  giftCapturedEmail: string
  pixPayerEmail: string
  cardPayment: GuestCardPaymentPersisted
  paymentMethod: GuestPaymentMethodChoice | null
}): string {
  if (isValidGuestEmail(input.giftCapturedEmail)) {
    return input.giftCapturedEmail.trim()
  }
  if (input.paymentMethod === 'pix') {
    const email = input.pixPayerEmail.trim()
    return isValidGuestEmail(email) ? email : ''
  }
  if (input.paymentMethod === 'credit_card' || input.paymentMethod === 'debit_card') {
    const email = input.cardPayment.payerEmail.trim()
    return isValidGuestEmail(email) ? email : ''
  }
  return ''
}

export function resolveMessagePhase(input: {
  guestEmail: string
  giftCapturedEmail: string
  draftPhase?: GuestMessagePhase
}): GuestMessagePhase {
  const resolvedEmail =
    input.guestEmail.trim() || input.giftCapturedEmail.trim()
  if (!isValidGuestEmail(resolvedEmail)) {
    return 'email'
  }
  if (input.draftPhase === 'compose') {
    return 'compose'
  }
  return 'compose'
}

export function resolveSubmitGuestEmail(
  guestEmail: string,
  giftCapturedEmail: string,
): string {
  const fromGuest = guestEmail.trim()
  if (isValidGuestEmail(fromGuest)) return fromGuest
  const fromGift = giftCapturedEmail.trim()
  if (isValidGuestEmail(fromGift)) return fromGift
  return ''
}

export function showGuestMessageEmailValidationError(t: TFunction): void {
  message.error(t('events.detail.guestMessage.emailValidationRequired'))
}

export function showGuestMessageEmailInvalidError(t: TFunction): void {
  message.error(t('events.detail.guestMessage.emailValidationInvalid'))
}

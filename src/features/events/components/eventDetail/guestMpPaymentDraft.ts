import type { GuestCheckoutSnapshot } from './guestCheckoutSession'

export function centsToMpAmount(totalCents: number): string {
  return (totalCents / 100).toFixed(2)
}

export type MpPayerIdentification = {
  type: string
  number: string
}

export type MpOrderPayer = {
  email: string
  first_name?: string
  last_name?: string
  identification?: MpPayerIdentification
}

export type MpOrderPaymentMethodCard = {
  id: string
  type: string
  token: string
  installments: number
}

export type MpOrderPaymentMethodPix = {
  id: 'pix'
  type: 'bank_transfer'
}

export type MpOrderPayment = {
  amount: string
  payment_method: MpOrderPaymentMethodCard | MpOrderPaymentMethodPix
}

export type MpCreateOrderBody = {
  type: 'online'
  processing_mode: 'automatic'
  total_amount: string
  external_reference?: string
  payer: MpOrderPayer
  transactions: {
    payments: MpOrderPayment[]
  }
}

export type GuestMpPixPayer = {
  email: string
}

export type GuestCardPaymentPersisted = {
  cardholderName: string
  payerEmail: string
  identificationType: string
  identificationNumber: string
  expirationMonth: string
  expirationYear: string
  installments: number
  paymentMethodId: string
}

export function createDefaultCardPaymentPersisted(): GuestCardPaymentPersisted {
  return {
    cardholderName: '',
    payerEmail: '',
    identificationType: 'CPF',
    identificationNumber: '',
    expirationMonth: '',
    expirationYear: '',
    installments: 1,
    paymentMethodId: '',
  }
}

export type GuestMpCardTokenResult = {
  token: string
  paymentMethodId: string
  paymentTypeId: string
}

export type GuestMpPaymentSnapshot =
  | { method: 'pix'; payer: GuestMpPixPayer }
  | { method: 'card'; card: GuestCardPaymentPersisted }

export type GuestMpPaymentDraft = {
  snapshot: GuestMpPaymentSnapshot
  orderBody: MpCreateOrderBody
}

export type GuestMpPaymentPayload = {
  checkout: GuestCheckoutSnapshot
  mpOrder: MpCreateOrderBody
}

export function buildMpOrderExternalReference(checkout: GuestCheckoutSnapshot): string {
  return `guest_${checkout.eventId}_${Date.now()}`
}

export function buildCardMpOrderBodyFromToken(
  checkout: GuestCheckoutSnapshot,
  card: GuestCardPaymentPersisted,
  tokenResult: GuestMpCardTokenResult,
): MpCreateOrderBody {
  const amount = centsToMpAmount(checkout.totalCents)
  return {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: amount,
    external_reference: buildMpOrderExternalReference(checkout),
    payer: {
      email: card.payerEmail.trim(),
      identification: {
        type: card.identificationType,
        number: card.identificationNumber.replace(/\D/g, ''),
      },
    },
    transactions: {
      payments: [
        {
          amount,
          payment_method: {
            id: tokenResult.paymentMethodId || card.paymentMethodId,
            type: tokenResult.paymentTypeId,
            token: tokenResult.token,
            installments: card.installments,
          },
        },
      ],
    },
  }
}

export function buildPixMpOrderBody(
  checkout: GuestCheckoutSnapshot,
  payer: GuestMpPixPayer,
): MpCreateOrderBody {
  const amount = centsToMpAmount(checkout.totalCents)
  return {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: amount,
    external_reference: buildMpOrderExternalReference(checkout),
    payer: {
      email: payer.email.trim(),
    },
    transactions: {
      payments: [
        {
          amount,
          payment_method: {
            id: 'pix',
            type: 'bank_transfer',
          },
        },
      ],
    },
  }
}

export function buildGuestMpPaymentPayload(
  checkout: GuestCheckoutSnapshot,
  draft: GuestMpPaymentDraft,
): GuestMpPaymentPayload {
  return {
    checkout,
    mpOrder: draft.orderBody,
  }
}

export function logGuestMpPaymentPayload(payload: GuestMpPaymentPayload) {
  if (import.meta.env.DEV) {
    console.info('[guest-mp-checkout]', payload)
  }
}

export function buildMockCardTokenResult(card: GuestCardPaymentPersisted): GuestMpCardTokenResult {
  return {
    token: 'mock_card_token_dev',
    paymentMethodId: card.paymentMethodId || 'visa',
    paymentTypeId: 'credit_card',
  }
}

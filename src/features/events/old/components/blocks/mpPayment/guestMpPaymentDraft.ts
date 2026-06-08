import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import type { GuestPaymentProviderId } from '../../invitationFlow/lib/guestPaymentProvider'

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

export type GuestMpCardPaymentTypeId = 'credit_card' | 'debit_card'

export type GuestCardPaymentPersisted = {
  cardholderName: string
  payerEmail: string
  identificationType: string
  identificationNumber: string
  expirationMonth: string
  expirationYear: string
  installments: number
  installmentAmount: number
  installmentTotalAmount: number
  paymentMethodId: string
  paymentTypeId: GuestMpCardPaymentTypeId
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
    installmentAmount: 0,
    installmentTotalAmount: 0,
    paymentMethodId: '',
    paymentTypeId: 'credit_card',
  }
}

export type GuestMpCardTokenResult = {
  token: string
  paymentMethodId: string
  paymentTypeId: string
}

export type GuestMpPaymentSnapshot =
  | { method: 'pix'; payer: GuestMpPixPayer; payment_provider: GuestPaymentProviderId }
  | { method: 'card'; card: GuestCardPaymentPersisted; payment_provider: GuestPaymentProviderId }

export type GuestMpPaymentDraft = {
  snapshot: GuestMpPaymentSnapshot
  orderBody: MpCreateOrderBody
}

/** @deprecated Use GuestCheckoutPayload from blocks/payment/types */
export type GuestMpPaymentPayload = GuestCheckoutSnapshot & {
  invitation_id: string
  payment_provider: GuestPaymentProviderId
  provider_checkout: MpCreateOrderBody
  mp_order: MpCreateOrderBody
}

export function buildMpOrderExternalReference(checkout: GuestCheckoutSnapshot): string {
  return `guest_${checkout.parent_id}_${Date.now()}`
}

export function buildCardMpOrderBodyFromToken(
  checkout: GuestCheckoutSnapshot,
  card: GuestCardPaymentPersisted,
  tokenResult: GuestMpCardTokenResult,
): MpCreateOrderBody {
  const amount = centsToMpAmount(checkout.total_cents)
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
  const amount = centsToMpAmount(checkout.total_cents)
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

/** @deprecated Use buildGuestCheckoutPayload from blocks/payment/checkoutPayload */
export function buildGuestMpPaymentPayload(
  invitationId: string,
  checkout: GuestCheckoutSnapshot,
  draft: GuestMpPaymentDraft,
): GuestMpPaymentPayload {
  const payment_provider =
    draft.snapshot.payment_provider ?? checkout.payment_provider
  if (!payment_provider) {
    throw new Error('Guest checkout payload requires payment_provider')
  }
  return {
    ...checkout,
    invitation_id: invitationId,
    payment_provider,
    provider_checkout: draft.orderBody,
    mp_order: draft.orderBody,
  }
}

/** @deprecated Use logGuestCheckoutPayload from blocks/payment/checkoutPayload */
export function logGuestMpPaymentPayload(payload: GuestMpPaymentPayload) {
  if (import.meta.env.DEV) {
    console.info('[guest-checkout]', payload)
  }
}


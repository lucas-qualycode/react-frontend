import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import type { GuestPaymentFinalizeResult } from './types'

export type { PixDisplayPayload, PaymentFailurePayload, PaymentNextAction, PaymentOutcomeFields, GuestPaymentStatusResponse, GiftCheckoutResponse } from '../../invitationFlow/lib/guestInvitationApi'

export type GuestCheckoutPayload = GuestCheckoutSnapshot & {
  invitation_id: string
  payment_provider: string
  provider_checkout: Record<string, unknown>
}

export function buildGuestCheckoutPayload(
  invitationId: string,
  checkout: GuestCheckoutSnapshot,
  finalize: GuestPaymentFinalizeResult,
): GuestCheckoutPayload {
  const payment_provider = finalize.payment_provider ?? checkout.payment_provider
  if (!payment_provider) {
    throw new Error('Guest checkout payload requires payment_provider')
  }
  return {
    ...checkout,
    invitation_id: invitationId,
    payment_provider,
    provider_checkout: finalize.provider_checkout as Record<string, unknown>,
  }
}

export function logGuestCheckoutPayload(payload: GuestCheckoutPayload) {
  if (import.meta.env.DEV) {
    console.info('[guest-checkout]', payload)
  }
}

import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import type { GuestCheckoutPayload, GuestPaymentFinalizeResult } from './types'

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
    provider_checkout: finalize.provider_checkout,
  }
}

export function logGuestCheckoutPayload(payload: GuestCheckoutPayload) {
  if (import.meta.env.DEV) {
    console.info('[guest-checkout]', payload)
  }
}

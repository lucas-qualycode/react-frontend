import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import { getGuestPaymentProvider } from './registry'
import type {
  GuestPaymentFinalizeContext,
  GuestPaymentFinalizeResult,
  GuestPaymentSnapshot,
} from './types'

export async function finalizeGuestPayment(
  checkout: GuestCheckoutSnapshot,
  snapshot: GuestPaymentSnapshot,
  context: GuestPaymentFinalizeContext,
): Promise<GuestPaymentFinalizeResult> {
  const provider = getGuestPaymentProvider(snapshot.payment_provider)
  return provider.finalizeCheckout(checkout, snapshot, context)
}

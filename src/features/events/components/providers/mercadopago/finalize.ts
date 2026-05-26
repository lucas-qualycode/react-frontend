import {
  buildCardOrderFromSnapshot,
  buildPixOrderFromSnapshot,
} from '../../blocks/mpPayment/guestMpPaymentForm'
import {
  buildMockCardTokenResult,
  type GuestMpPaymentSnapshot,
} from '../../blocks/mpPayment/guestMpPaymentDraft'
import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import { GUEST_PAYMENT_PROVIDER_MERCADOPAGO } from '../../invitationFlow/lib/guestPaymentProvider'
import type {
  GuestPaymentFinalizeContext,
  GuestPaymentFinalizeResult,
  GuestPaymentSnapshot,
} from '../../blocks/payment/types'

function assertMercadoPagoSnapshot(
  snapshot: GuestPaymentSnapshot,
): GuestMpPaymentSnapshot {
  if (snapshot.payment_provider !== GUEST_PAYMENT_PROVIDER_MERCADOPAGO) {
    throw new Error(`Expected Mercado Pago snapshot, got ${snapshot.payment_provider}`)
  }
  return snapshot
}

export async function finalizeMercadoPagoGuestPayment(
  checkout: GuestCheckoutSnapshot,
  snapshot: GuestPaymentSnapshot,
  context: GuestPaymentFinalizeContext,
): Promise<GuestPaymentFinalizeResult> {
  const mpSnapshot = assertMercadoPagoSnapshot(snapshot)

  let provider_checkout
  if (mpSnapshot.method === 'pix') {
    provider_checkout = buildPixOrderFromSnapshot(checkout, mpSnapshot)
  } else {
    const cardForm = {
      ...mpSnapshot.card,
      ...(context.cardSecrets ?? { cardNumber: '', securityCode: '' }),
    }
    const tokenResult = context.canCreateCardToken && context.createCardToken
      ? await context.createCardToken(cardForm)
      : buildMockCardTokenResult(mpSnapshot.card)
    provider_checkout = buildCardOrderFromSnapshot(checkout, mpSnapshot, tokenResult)
  }

  return {
    payment_provider: GUEST_PAYMENT_PROVIDER_MERCADOPAGO,
    provider_checkout,
  }
}

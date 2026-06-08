import type { GuestPaymentProviderId } from '../../invitationFlow/lib/guestPaymentProvider'
import { mercadoPagoGuestPaymentProvider } from '../../providers/mercadopago'
import type { GuestPaymentProviderModule } from './types'

export const GUEST_PAYMENT_PROVIDERS: Record<
  GuestPaymentProviderId,
  GuestPaymentProviderModule
> = {
  mercadopago: mercadoPagoGuestPaymentProvider,
}

export const DEFAULT_GUEST_PAYMENT_PROVIDER_ID = mercadoPagoGuestPaymentProvider.id

export function getGuestPaymentProvider(
  id: GuestPaymentProviderId,
): GuestPaymentProviderModule {
  const provider = GUEST_PAYMENT_PROVIDERS[id]
  if (!provider) {
    throw new Error(`Unknown guest payment provider: ${id}`)
  }
  return provider
}

export function getDefaultGuestPaymentProvider(): GuestPaymentProviderModule {
  return getGuestPaymentProvider(DEFAULT_GUEST_PAYMENT_PROVIDER_ID)
}

export const GUEST_PAYMENT_PROVIDER_MERCADOPAGO = 'mercadopago' as const

export type GuestPaymentProviderId = typeof GUEST_PAYMENT_PROVIDER_MERCADOPAGO

const KNOWN_PROVIDERS: readonly GuestPaymentProviderId[] = [GUEST_PAYMENT_PROVIDER_MERCADOPAGO]

export function guestPaymentProviderForMpPaymentBlock(): GuestPaymentProviderId {
  return GUEST_PAYMENT_PROVIDER_MERCADOPAGO
}

export function normalizeGuestPaymentProvider(raw: unknown): GuestPaymentProviderId | undefined {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value) return undefined
  if ((KNOWN_PROVIDERS as readonly string[]).includes(value)) {
    return value as GuestPaymentProviderId
  }
  return undefined
}

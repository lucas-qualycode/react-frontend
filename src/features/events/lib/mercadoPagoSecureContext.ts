export function canUseMercadoPagoCardTokenization(): boolean {
  if (typeof window === 'undefined') return true
  return window.location.protocol === 'https:'
}

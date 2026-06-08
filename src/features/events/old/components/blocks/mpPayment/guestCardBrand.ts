export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'diners' | 'unknown'

export const CARD_NUMBER_MAX_DIGITS = 19

export function cardNumberLengthForBrand(brand: CardBrand): number | null {
  switch (brand) {
    case 'amex':
      return 15
    case 'diners':
      return 14
    default:
      return null
  }
}

export function inferCardBrandFromDigits(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^36/.test(digits)) return 'diners'
  return 'unknown'
}

export function resolveCardBrandForCardNumber(
  paymentMethodId: string | undefined,
  digits: string,
): CardBrand {
  const fromId = resolveCardBrand(paymentMethodId)
  if (fromId !== 'unknown') return fromId
  return inferCardBrandFromDigits(digits)
}

export function getCardNumberMaxLength(paymentMethodId: string | undefined, digits: string): number {
  const brand = resolveCardBrandForCardNumber(paymentMethodId, digits)
  return cardNumberLengthForBrand(brand) ?? CARD_NUMBER_MAX_DIGITS
}

export function isValidCardNumber(cardNumber: string, paymentMethodId: string | undefined): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (!digits) return false

  const brand = resolveCardBrandForCardNumber(paymentMethodId, digits)
  const expected = cardNumberLengthForBrand(brand)
  if (expected !== null) return digits.length === expected

  return digits.length >= 13 && digits.length <= CARD_NUMBER_MAX_DIGITS
}

export function cardNumberInputMaxLength(paymentMethodId: string | undefined, digits: string): number {
  const maxDigits = getCardNumberMaxLength(paymentMethodId, digits)
  if (maxDigits === 15) return 17
  if (maxDigits === 14) return 16
  return maxDigits + Math.floor((maxDigits - 1) / 4)
}

export function resolveCardBrand(brandId: string | undefined): CardBrand {
  if (!brandId?.trim()) return 'unknown'
  const id = brandId.toLowerCase()
  if (id.includes('visa')) return 'visa'
  if (id.includes('master')) return 'mastercard'
  if (id.includes('amex') || id.includes('american')) return 'amex'
  if (id.includes('elo')) return 'elo'
  if (id.includes('hiper')) return 'hipercard'
  if (id.includes('diners')) return 'diners'
  return 'unknown'
}

export function cardBrandFrontClass(brand: CardBrand): string {
  switch (brand) {
    case 'visa':
      return 'brand-visa'
    case 'mastercard':
      return 'brand-master'
    case 'amex':
      return 'brand-amex'
    case 'elo':
      return 'brand-elo'
    case 'hipercard':
      return 'brand-hipercard'
    case 'diners':
      return 'brand-diners'
    default:
      return ''
  }
}

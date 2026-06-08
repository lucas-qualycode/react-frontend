import type { GuestCardPaymentPersisted } from './guestMpPaymentDraft'
import { centsToMpAmount } from './guestMpPaymentDraft'
import { normalizeCardNumber } from './guestMpPaymentForm'

export type MpInstallmentCost = {
  installments: number
  installment_amount: number
  total_amount: number
  recommended_message?: string
}

export type GuestInstallmentOption = {
  installments: number
  installmentAmount: number
  totalAmount: number
  label: string
}

export function cardBinForInstallments(cardNumber: string): string {
  return normalizeCardNumber(cardNumber).slice(0, 8)
}

function currencyFormatter(locale: string) {
  const normalizedLocale = locale.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
  return new Intl.NumberFormat(normalizedLocale, { style: 'currency', currency: 'BRL' })
}

export function formatInstallmentOptionLabel(
  cost: Pick<MpInstallmentCost, 'installments' | 'installment_amount' | 'total_amount' | 'recommended_message'>,
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const recommended = cost.recommended_message?.trim()
  if (recommended) return recommended

  const format = currencyFormatter(locale)
  const installment = format.format(cost.installment_amount)
  const total = format.format(cost.total_amount)

  if (cost.installments === 1) {
    return t('events.detail.guestMpPayment.installmentOptionSingle', { total })
  }

  return t('events.detail.guestMpPayment.installmentOptionDetailed', {
    count: cost.installments,
    installment,
    total,
  })
}

export function buildInstallmentOptionsFromMpCosts(
  costs: MpInstallmentCost[],
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): GuestInstallmentOption[] {
  return costs
    .filter((cost) => cost.installments >= 1)
    .sort((a, b) => a.installments - b.installments)
    .map((cost) => ({
      installments: cost.installments,
      installmentAmount: cost.installment_amount,
      totalAmount: cost.total_amount,
      label: formatInstallmentOptionLabel(cost, locale, t),
    }))
}

export function buildFallbackInstallmentOptions(
  totalCents: number,
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
  maxInstallments = 12,
): GuestInstallmentOption[] {
  const totalAmount = totalCents / 100

  return Array.from({ length: maxInstallments }, (_, index) => {
    const installments = index + 1
    const installmentAmount = totalAmount / installments
    return {
      installments,
      installmentAmount,
      totalAmount,
      label: formatInstallmentOptionLabel(
        {
          installments,
          installment_amount: installmentAmount,
          total_amount: totalAmount,
        },
        locale,
        t,
      ),
    }
  })
}

export function mpInstallmentAmount(totalCents: number): string {
  return centsToMpAmount(totalCents)
}

export function resolveInstallmentDisplayAmounts(
  card: GuestCardPaymentPersisted,
  totalCents: number,
  options: GuestInstallmentOption[] = [],
): {
  installments: number
  installmentAmount: number
  installmentTotalAmount: number
} {
  const installments = Math.max(1, Number(card.installments) || 1)
  const checkoutTotal = totalCents / 100
  const matched = options.find((option) => option.installments === installments)

  if (matched) {
    return {
      installments: matched.installments,
      installmentAmount: matched.installmentAmount,
      installmentTotalAmount: matched.totalAmount,
    }
  }

  return {
    installments,
    installmentAmount:
      card.installmentAmount > 0 ? card.installmentAmount : checkoutTotal / installments,
    installmentTotalAmount:
      card.installmentTotalAmount > 0 ? card.installmentTotalAmount : checkoutTotal,
  }
}

export function resolveCardPaymentInstallments(
  card: GuestCardPaymentPersisted,
  options: GuestInstallmentOption[],
  totalCents: number,
): GuestCardPaymentPersisted {
  const resolved = resolveInstallmentDisplayAmounts(card, totalCents, options)
  return { ...card, ...resolved }
}

export function formatCardPaymentTotalReviewLabel(
  installments: number,
  installmentAmount: number,
  installmentTotalAmount: number,
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const count = Math.max(1, Number(installments) || 1)
  const format = currencyFormatter(locale)
  const installment = format.format(installmentAmount)
  const total = format.format(installmentTotalAmount)

  return t('events.detail.guestReview.paymentTotalWithInstallments', {
    count,
    installment,
    total,
  })
}

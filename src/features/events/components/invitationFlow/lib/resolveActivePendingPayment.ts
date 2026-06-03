import type { InvitationPaymentSummary } from './guestInvitationApi'

export function isPendingPaymentStatus(status: string): boolean {
  const normalized = status.toUpperCase()
  return normalized === 'PENDING' || normalized === 'PROCESSING'
}

export function resolveActivePendingPayment(
  payments: InvitationPaymentSummary[],
): InvitationPaymentSummary | null {
  return payments.find((payment) => isPendingPaymentStatus(payment.status)) ?? null
}

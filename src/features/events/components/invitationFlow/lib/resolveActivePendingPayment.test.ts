import { describe, expect, it } from 'vitest'
import {
  isPendingPaymentStatus,
  resolveActivePendingPayment,
} from './resolveActivePendingPayment'
import type { InvitationPaymentSummary } from './guestInvitationApi'

function payment(
  id: string,
  status: string,
  created_at: string,
): InvitationPaymentSummary {
  return {
    id,
    status,
    amount: 1200,
    currency: 'BRL',
    created_at,
    order_id: `order-${id}`,
    items: [],
  }
}

describe('resolveActivePendingPayment', () => {
  it('returns the first pending payment in list order', () => {
    const payments = [
      payment('pay-new', 'PENDING', '2026-01-02T10:00:00Z'),
      payment('pay-old', 'PROCESSING', '2026-01-01T10:00:00Z'),
      payment('pay-done', 'APPROVED', '2026-01-03T10:00:00Z'),
    ]

    expect(resolveActivePendingPayment(payments)?.id).toBe('pay-new')
  })

  it('returns null when no pending payments exist', () => {
    expect(
      resolveActivePendingPayment([payment('pay-done', 'APPROVED', '2026-01-01T10:00:00Z')]),
    ).toBeNull()
  })
})

describe('isPendingPaymentStatus', () => {
  it.each(['PENDING', 'pending', 'PROCESSING', 'processing'])('true for %s', (status) => {
    expect(isPendingPaymentStatus(status)).toBe(true)
  })

  it.each(['APPROVED', 'FAILED', 'CANCELLED', 'REFUNDED'])('false for %s', (status) => {
    expect(isPendingPaymentStatus(status)).toBe(false)
  })
})

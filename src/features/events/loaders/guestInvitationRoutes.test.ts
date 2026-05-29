import { describe, expect, it } from 'vitest'
import {
  guestInvitationPath,
  isLegacyGuestInvitationPath,
  resolveGuestInvitationPhase,
} from './guestInvitationRoutes'
import type { ActiveCheckoutResponse } from '../components/blocks/payment/checkoutPayload'

const access = { invitationId: 'inv1', token: 'tok' }
const eventId = 'evt1'
const invitationId = 'inv1'

function active(overrides: Partial<ActiveCheckoutResponse> = {}): ActiveCheckoutResponse {
  return {
    active: false,
    has_approved_payment: false,
    payment_status: 'PENDING',
    next_action: 'wait',
    ...overrides,
  }
}

describe('guestInvitationPath', () => {
  it('returns canonical invitation URL with token', () => {
    const path = guestInvitationPath(eventId, invitationId, access)
    expect(path).toBe(`/events/${eventId}/invitation/${invitationId}?token=${access.token}&invitation_id=${invitationId}`)
  })
})

describe('isLegacyGuestInvitationPath', () => {
  it('detects legacy payment and confirmed suffixes', () => {
    expect(isLegacyGuestInvitationPath('/events/e/invitation/i/payment')).toBe(true)
    expect(isLegacyGuestInvitationPath('/events/e/invitation/i/confirmed')).toBe(true)
    expect(isLegacyGuestInvitationPath('/events/e/invitation/i')).toBe(false)
  })
})

describe('resolveGuestInvitationPhase', () => {
  const cases: Array<{
    checkout: ActiveCheckoutResponse | null
    expected: 'wizard' | 'payment' | 'confirmed'
  }> = [
    { checkout: null, expected: 'wizard' },
    {
      checkout: active({ active: true, payment_status: 'PENDING', payment_id: 'pay-1' }),
      expected: 'payment',
    },
    {
      checkout: active({
        payment_status: 'APPROVED',
        has_approved_payment: true,
        payment_id: 'pay-1',
      }),
      expected: 'confirmed',
    },
    {
      checkout: active({
        payment_status: 'CANCELLED',
        payment_id: 'pay-1',
        next_action: 'failed',
      }),
      expected: 'payment',
    },
    {
      checkout: active({
        payment_status: 'FAILED',
        payment_id: 'pay-1',
        next_action: 'failed',
      }),
      expected: 'payment',
    },
    { checkout: active({ payment_status: 'FAILED' }), expected: 'wizard' },
    {
      checkout: active({
        active: false,
        payment_status: null,
        next_action: null,
        payment_id: null,
      }),
      expected: 'wizard',
    },
  ]

  it.each(cases)('$expected for $checkout.payment_status', ({ checkout, expected }) => {
    expect(resolveGuestInvitationPhase(checkout)).toBe(expected)
  })
})

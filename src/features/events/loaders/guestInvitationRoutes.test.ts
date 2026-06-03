import { describe, expect, it } from 'vitest'
import { inferWizardStepFromInvitationStatus } from '../components/invitationFlow/lib/inferWizardStep'
import {
  guestInvitationPath,
  isLegacyGuestInvitationPath,
} from './guestInvitationRoutes'

const access = { invitationId: 'inv1', token: 'tok' }
const eventId = 'evt1'
const invitationId = 'inv1'

describe('guestInvitationPath', () => {
  it('returns canonical invitation URL with token', () => {
    const path = guestInvitationPath(eventId, invitationId, access)
    expect(path).toBe(
      `/events/${eventId}/invitation/${invitationId}?token=${access.token}&invitation_id=${invitationId}`,
    )
  })
})

describe('isLegacyGuestInvitationPath', () => {
  it('detects legacy payment and confirmed suffixes', () => {
    expect(isLegacyGuestInvitationPath('/events/e/invitation/i/payment')).toBe(true)
    expect(isLegacyGuestInvitationPath('/events/e/invitation/i/confirmed')).toBe(true)
    expect(isLegacyGuestInvitationPath('/events/e/invitation/i')).toBe(false)
  })
})

describe('inferWizardStepFromInvitationStatus', () => {
  it.each([
    { status: 'CREATED', expected: 'guests' },
    { status: 'SENT', expected: 'guests' },
    { status: 'ACCEPTED', expected: 'finished' },
    { status: 'DECLINED', expected: 'finished' },
    { status: 'CANCELLED', expected: 'welcome' },
    { status: undefined, expected: 'guests' },
  ])('$status → $expected', ({ status, expected }) => {
    expect(inferWizardStepFromInvitationStatus(status)).toBe(expected)
  })
})

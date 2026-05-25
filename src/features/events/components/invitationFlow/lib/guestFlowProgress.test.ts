import { describe, expect, it } from 'vitest'
import {
  buildGuestFlowProgressCompletion,
  guestFlowProgressStepCanNavigate,
  guestFlowProgressStepStatus,
} from './guestFlowProgress'

describe('guestFlowProgress', () => {
  it('marks filled steps as completed and navigable when user is on an earlier step', () => {
    const checkout = {
      parent_id: 'e1',
      total_cents: 0,
      line_items: [],
      currency: 'BRL' as const,
    }
    const completion = buildGuestFlowProgressCompletion({
      guestsSaved: true,
      confirmPhase: 'review',
      lastSavedGuestsFingerprint: 'fp',
      checkout,
      mpPaymentSnapshot: false,
      messageSaved: true,
      maxProgressIndexReached: 4,
    })

    expect(guestFlowProgressStepStatus('gift', 'confirm', checkout, completion)).toBe('completed')
    expect(guestFlowProgressStepCanNavigate('message', 'confirm', checkout, completion)).toBe(
      true,
    )
  })

  it('keeps upcoming steps disabled when not filled', () => {
    const completion = buildGuestFlowProgressCompletion({
      guestsSaved: false,
      confirmPhase: 'form',
      lastSavedGuestsFingerprint: null,
      checkout: null,
      mpPaymentSnapshot: false,
      messageSaved: false,
      maxProgressIndexReached: 0,
    })

    expect(guestFlowProgressStepStatus('gift', 'confirm', null, completion)).toBe('upcoming')
    expect(guestFlowProgressStepCanNavigate('gift', 'confirm', null, completion)).toBe(false)
  })
})

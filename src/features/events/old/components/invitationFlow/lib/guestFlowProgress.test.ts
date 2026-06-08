import { describe, expect, it } from 'vitest'
import {
  buildGuestFlowProgressCompletion,
  guestFlowProgressStepCanNavigate,
  guestFlowProgressStepStatus,
} from './guestFlowProgress'

describe('guestFlowProgress', () => {
  it('marks filled steps as completed but only the current step is navigable', () => {
    const completion = buildGuestFlowProgressCompletion({
      guestsConfirmed: true,
      confirmPhase: 'review',
      giftsCompleted: true,
      messageSaved: true,
      maxProgressIndexReached: 3,
    })

    expect(guestFlowProgressStepStatus('gifts', 'guests', completion)).toBe('completed')
    expect(guestFlowProgressStepCanNavigate('message', 'guests', completion)).toBe(false)
    expect(guestFlowProgressStepCanNavigate('guests', 'guests', completion)).toBe(true)
    expect(guestFlowProgressStepStatus('finished', 'guests', completion)).toBe('upcoming')
    expect(guestFlowProgressStepCanNavigate('finished', 'guests', completion)).toBe(false)
  })

  it('keeps upcoming steps disabled when not filled', () => {
    const completion = buildGuestFlowProgressCompletion({
      guestsConfirmed: false,
      confirmPhase: 'form',
      giftsCompleted: false,
      messageSaved: false,
      maxProgressIndexReached: 0,
    })

    expect(guestFlowProgressStepStatus('gifts', 'guests', completion)).toBe('upcoming')
    expect(guestFlowProgressStepCanNavigate('gifts', 'guests', completion)).toBe(false)
  })
})

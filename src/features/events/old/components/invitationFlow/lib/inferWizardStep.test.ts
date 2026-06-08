import { describe, expect, it } from 'vitest'
import { inferWizardStepFromInvitationStatus } from './inferWizardStep'

describe('inferWizardStepFromInvitationStatus', () => {
  it('defaults to guests for sent invitations', () => {
    expect(inferWizardStepFromInvitationStatus('CREATED')).toBe('guests')
    expect(inferWizardStepFromInvitationStatus('SENT')).toBe('guests')
  })

  it('returns finished for accepted or declined invitations', () => {
    expect(inferWizardStepFromInvitationStatus('ACCEPTED')).toBe('finished')
    expect(inferWizardStepFromInvitationStatus('DECLINED')).toBe('finished')
  })

  it('returns welcome for cancelled or missing status', () => {
    expect(inferWizardStepFromInvitationStatus('CANCELLED')).toBe('welcome')
    expect(inferWizardStepFromInvitationStatus(undefined)).toBe('guests')
  })
})

import { describe, expect, it } from 'vitest'
import { resolveWizardStepFromInvitation } from './resolveWizardStep'

describe('resolveWizardStepFromInvitation', () => {
  it('uses backend wizard_step when present', () => {
    expect(resolveWizardStepFromInvitation({ status: 'SENT', wizard_step: 'welcome' })).toBe(
      'welcome',
    )
    expect(resolveWizardStepFromInvitation({ status: 'SENT', wizard_step: 'gifts' })).toBe('gifts')
    expect(resolveWizardStepFromInvitation({ status: 'SENT', wizard_step: 'message' })).toBe(
      'message',
    )
    expect(resolveWizardStepFromInvitation({ status: 'ACCEPTED', wizard_step: 'finished' })).toBe(
      'finished',
    )
  })

  it('defaults to welcome for sent invitations without wizard_step', () => {
    expect(resolveWizardStepFromInvitation({ status: 'SENT' })).toBe('welcome')
    expect(resolveWizardStepFromInvitation({ status: 'CREATED' })).toBe('welcome')
  })

  it('falls back to finished for accepted or declined without wizard_step', () => {
    expect(resolveWizardStepFromInvitation({ status: 'ACCEPTED' })).toBe('finished')
    expect(resolveWizardStepFromInvitation({ status: 'DECLINED' })).toBe('finished')
  })

  it('returns welcome for cancelled invitations', () => {
    expect(resolveWizardStepFromInvitation({ status: 'CANCELLED', wizard_step: 'gifts' })).toBe(
      'welcome',
    )
  })
})

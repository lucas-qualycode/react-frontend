import type { InvitationStatus } from '@/shared/types/api'
import type { EventGuestFlowStep } from '../types'

export type InvitationWizardStep = 'welcome' | 'guests' | 'gifts' | 'message' | 'finished'

export function isInvitationWizardStep(value: string | null | undefined): value is InvitationWizardStep {
  return (
    value === 'welcome' ||
    value === 'guests' ||
    value === 'gifts' ||
    value === 'message' ||
    value === 'finished'
  )
}

export function resolveWizardStepFromInvitation(invitation: {
  status?: InvitationStatus | string
  wizard_step?: InvitationWizardStep | string | null
}): EventGuestFlowStep {
  if (invitation.status === 'CANCELLED') {
    return 'welcome'
  }

  const wizardStep = invitation.wizard_step
  if (isInvitationWizardStep(wizardStep)) {
    return wizardStep
  }

  if (invitation.status === 'ACCEPTED' || invitation.status === 'DECLINED') {
    return 'finished'
  }

  return 'welcome'
}

export function flowStepFromWizardStep(wizardStep: InvitationWizardStep | string | null | undefined): EventGuestFlowStep {
  if (isInvitationWizardStep(wizardStep)) {
    return wizardStep
  }
  return 'welcome'
}

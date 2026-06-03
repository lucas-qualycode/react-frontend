import type { InvitationStatus } from '@/shared/types/api'
import type { EventGuestFlowStep } from '../types'
import { resolveWizardStepFromInvitation } from './resolveWizardStep'

export function inferWizardStepFromInvitationStatus(
  status: InvitationStatus | string | undefined,
): EventGuestFlowStep {
  return resolveWizardStepFromInvitation({ status })
}

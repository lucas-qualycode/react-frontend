import { createWizardIdentityPath } from '@/features/events/create/createWizardSteps'
import type { Event } from '@/shared/types/api'

export function isEventSetupDraft(
  event: Pick<Event, 'active' | 'setup_completed_at'>,
): boolean {
  return !event.active && !event.setup_completed_at
}

export function eventManagePath(event: Pick<Event, 'id' | 'active' | 'setup_completed_at'>): string {
  if (isEventSetupDraft(event)) {
    return createWizardIdentityPath(event.id)
  }
  return `/events/${event.id}/edit`
}

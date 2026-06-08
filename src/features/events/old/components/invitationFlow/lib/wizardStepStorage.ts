import type { EventGuestFlowStep } from '../types'

const LEGACY_STEP_MAP: Record<string, EventGuestFlowStep> = {
  confirm: 'guests',
  gift: 'gifts',
  mp_payment: 'gifts',
  review: 'finished',
  decline: 'guests',
}

export function migrateLegacyWizardStep(step: string): EventGuestFlowStep {
  if (step in LEGACY_STEP_MAP) {
    return LEGACY_STEP_MAP[step]
  }
  if (
    step === 'welcome' ||
    step === 'guests' ||
    step === 'gifts' ||
    step === 'message' ||
    step === 'finished'
  ) {
    return step
  }
  return 'welcome'
}

export function loadWizardStep(invitationId: string): EventGuestFlowStep | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`partiiu:wizard-step:${invitationId}`)
    if (!raw) return null
    return migrateLegacyWizardStep(raw)
  } catch {
    return null
  }
}

export function saveWizardStep(invitationId: string, step: EventGuestFlowStep): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(`partiiu:wizard-step:${invitationId}`, step)
  } catch {
    /* ignore */
  }
}

export function clearWizardStep(invitationId: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(`partiiu:wizard-step:${invitationId}`)
  } catch {
    /* ignore */
  }
}

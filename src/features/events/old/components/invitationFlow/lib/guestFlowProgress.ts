import type { GuestConfirmPhase } from './guestFlowDraft'
import { GUEST_FLOW_STEP_INDEX, type EventGuestFlowStep } from '../types'

export const GUEST_FLOW_PROGRESS_STEPS = [
  'guests',
  'gifts',
  'message',
  'finished',
] as const satisfies readonly EventGuestFlowStep[]

export type GuestFlowProgressStep = (typeof GUEST_FLOW_PROGRESS_STEPS)[number]

export type GuestFlowProgressStepStatus = 'completed' | 'current' | 'upcoming'

export type GuestFlowProgressCompletion = Record<GuestFlowProgressStep, boolean>

const PROGRESS_INDEX: Record<GuestFlowProgressStep, number> = {
  guests: 0,
  gifts: 1,
  message: 2,
  finished: 3,
}

export function guestFlowShowsProgressIndicator(step: EventGuestFlowStep): boolean {
  if (step === 'finished') return false
  return (GUEST_FLOW_PROGRESS_STEPS as readonly EventGuestFlowStep[]).includes(step)
}

export function guestFlowProgressActiveIndex(step: EventGuestFlowStep): number {
  if (!(GUEST_FLOW_PROGRESS_STEPS as readonly EventGuestFlowStep[]).includes(step)) return -1
  return PROGRESS_INDEX[step as GuestFlowProgressStep]
}

export function buildGuestFlowProgressCompletion(input: {
  guestsConfirmed: boolean
  confirmPhase: GuestConfirmPhase
  giftsCompleted: boolean
  messageSaved: boolean
  maxProgressIndexReached: number
}): GuestFlowProgressCompletion {
  const guests =
    input.guestsConfirmed ||
    input.confirmPhase === 'review'

  const gifts = input.giftsCompleted

  const message = input.messageSaved

  const finished = input.maxProgressIndexReached >= PROGRESS_INDEX.finished

  return { guests, gifts, message, finished }
}

export function guestFlowProgressStepIsFilled(
  progressStep: GuestFlowProgressStep,
  completion: GuestFlowProgressCompletion,
): boolean {
  return completion[progressStep]
}

export function guestFlowProgressStepStatus(
  progressStep: GuestFlowProgressStep,
  activeStep: EventGuestFlowStep,
  completion: GuestFlowProgressCompletion,
): GuestFlowProgressStepStatus {
  const activeIndex = guestFlowProgressActiveIndex(activeStep)
  const stepIndex = PROGRESS_INDEX[progressStep]

  if (activeIndex < 0) return 'upcoming'

  if (stepIndex === activeIndex) return 'current'

  if (progressStep === 'finished') {
    return completion.finished ? 'completed' : 'upcoming'
  }

  if (guestFlowProgressStepIsFilled(progressStep, completion)) {
    return 'completed'
  }

  if (stepIndex < activeIndex) return 'completed'
  return 'upcoming'
}

export function guestFlowProgressStepCanNavigate(
  progressStep: GuestFlowProgressStep,
  activeStep: EventGuestFlowStep,
  _completion: GuestFlowProgressCompletion,
): boolean {
  const activeIndex = guestFlowProgressActiveIndex(activeStep)
  const stepIndex = PROGRESS_INDEX[progressStep]
  if (activeIndex < 0) return false
  return stepIndex === activeIndex
}

export function guestFlowProgressConnectorFilled(
  progressStep: GuestFlowProgressStep,
  activeStep: EventGuestFlowStep,
  completion: GuestFlowProgressCompletion,
): boolean {
  const status = guestFlowProgressStepStatus(progressStep, activeStep, completion)
  return status === 'completed' || status === 'current'
}

export function guestFlowProgressNavigationTarget(
  progressStep: GuestFlowProgressStep,
): EventGuestFlowStep {
  return progressStep
}

export { GUEST_FLOW_STEP_INDEX }

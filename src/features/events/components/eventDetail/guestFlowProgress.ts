import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import { GUEST_FLOW_STEP_INDEX, type EventGuestFlowStep } from './types'

export const GUEST_FLOW_PROGRESS_STEPS = [
  'confirm',
  'gift',
  'mp_payment',
  'message',
  'review',
] as const satisfies readonly EventGuestFlowStep[]

export type GuestFlowProgressStep = (typeof GUEST_FLOW_PROGRESS_STEPS)[number]

export type GuestFlowProgressStepStatus = 'completed' | 'current' | 'upcoming'

const PROGRESS_INDEX: Record<GuestFlowProgressStep, number> = {
  confirm: 0,
  gift: 1,
  mp_payment: 2,
  message: 3,
  review: 4,
}

export function guestFlowShowsProgressIndicator(step: EventGuestFlowStep): boolean {
  return (GUEST_FLOW_PROGRESS_STEPS as readonly EventGuestFlowStep[]).includes(step)
}

export function guestFlowProgressActiveIndex(step: EventGuestFlowStep): number {
  if (!guestFlowShowsProgressIndicator(step)) return -1
  return PROGRESS_INDEX[step as GuestFlowProgressStep]
}

function isPaymentStepSkipped(
  activeStep: EventGuestFlowStep,
  checkout: GuestCheckoutSnapshot | null,
): boolean {
  return (
    checkout !== null &&
    checkout.totalCents === 0 &&
    GUEST_FLOW_STEP_INDEX[activeStep] >= GUEST_FLOW_STEP_INDEX.message
  )
}

export function guestFlowProgressStepStatus(
  progressStep: GuestFlowProgressStep,
  activeStep: EventGuestFlowStep,
  checkout: GuestCheckoutSnapshot | null,
): GuestFlowProgressStepStatus {
  const activeIndex = guestFlowProgressActiveIndex(activeStep)
  const stepIndex = PROGRESS_INDEX[progressStep]

  if (activeIndex < 0) return 'upcoming'

  if (progressStep === 'mp_payment' && isPaymentStepSkipped(activeStep, checkout)) {
    return 'completed'
  }

  if (stepIndex < activeIndex) return 'completed'
  if (stepIndex === activeIndex) return 'current'
  return 'upcoming'
}

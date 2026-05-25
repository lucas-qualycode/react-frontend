import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import type { GuestConfirmPhase } from './guestFlowDraft'
import { GUEST_FLOW_STEP_INDEX, type EventGuestFlowStep } from '../types'

export const GUEST_FLOW_PROGRESS_STEPS = [
  'confirm',
  'gift',
  'mp_payment',
  'message',
  'review',
] as const satisfies readonly EventGuestFlowStep[]

export type GuestFlowProgressStep = (typeof GUEST_FLOW_PROGRESS_STEPS)[number]

export type GuestFlowProgressStepStatus = 'completed' | 'current' | 'upcoming'

export type GuestFlowProgressCompletion = Record<GuestFlowProgressStep, boolean>

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

export function buildGuestFlowProgressCompletion(input: {
  guestsSaved: boolean
  confirmPhase: GuestConfirmPhase
  lastSavedGuestsFingerprint: string | null
  checkout: GuestCheckoutSnapshot | null
  mpPaymentSnapshot: boolean
  messageSaved: boolean
  maxProgressIndexReached: number
}): GuestFlowProgressCompletion {
  const confirm =
    input.guestsSaved ||
    input.confirmPhase === 'review' ||
    input.lastSavedGuestsFingerprint !== null

  const gift = input.checkout !== null

  const paymentSkipped =
    input.checkout !== null && input.checkout.total_cents === 0

  const mp_payment =
    paymentSkipped ||
    input.mpPaymentSnapshot ||
    input.messageSaved ||
    input.maxProgressIndexReached >= PROGRESS_INDEX.mp_payment

  const message = input.messageSaved

  const review = input.maxProgressIndexReached >= PROGRESS_INDEX.review

  return { confirm, gift, mp_payment, message, review }
}

export function guestFlowProgressStepIsFilled(
  progressStep: GuestFlowProgressStep,
  completion: GuestFlowProgressCompletion,
  checkout: GuestCheckoutSnapshot | null,
  activeStep: EventGuestFlowStep,
): boolean {
  if (progressStep === 'mp_payment' && isPaymentStepSkipped(activeStep, checkout)) {
    return true
  }
  return completion[progressStep]
}

function isPaymentStepSkipped(
  activeStep: EventGuestFlowStep,
  checkout: GuestCheckoutSnapshot | null,
): boolean {
  return (
    checkout !== null &&
    checkout.total_cents === 0 &&
    GUEST_FLOW_STEP_INDEX[activeStep] >= GUEST_FLOW_STEP_INDEX.message
  )
}

export function guestFlowProgressStepStatus(
  progressStep: GuestFlowProgressStep,
  activeStep: EventGuestFlowStep,
  checkout: GuestCheckoutSnapshot | null,
  completion: GuestFlowProgressCompletion,
): GuestFlowProgressStepStatus {
  const activeIndex = guestFlowProgressActiveIndex(activeStep)
  const stepIndex = PROGRESS_INDEX[progressStep]

  if (activeIndex < 0) return 'upcoming'

  if (stepIndex === activeIndex) return 'current'

  if (guestFlowProgressStepIsFilled(progressStep, completion, checkout, activeStep)) {
    return 'completed'
  }

  if (progressStep === 'mp_payment' && isPaymentStepSkipped(activeStep, checkout)) {
    return 'completed'
  }

  if (stepIndex < activeIndex) return 'completed'
  return 'upcoming'
}

export function guestFlowProgressStepCanNavigate(
  progressStep: GuestFlowProgressStep,
  activeStep: EventGuestFlowStep,
  checkout: GuestCheckoutSnapshot | null,
  completion: GuestFlowProgressCompletion,
): boolean {
  const status = guestFlowProgressStepStatus(
    progressStep,
    activeStep,
    checkout,
    completion,
  )
  if (status === 'current' || status === 'completed') return true
  return guestFlowProgressStepIsFilled(progressStep, completion, checkout, activeStep)
}

export function guestFlowProgressConnectorFilled(
  progressStep: GuestFlowProgressStep,
  activeStep: EventGuestFlowStep,
  checkout: GuestCheckoutSnapshot | null,
  completion: GuestFlowProgressCompletion,
): boolean {
  const status = guestFlowProgressStepStatus(
    progressStep,
    activeStep,
    checkout,
    completion,
  )
  return status === 'completed' || status === 'current'
}

export function guestFlowProgressNavigationTarget(
  progressStep: GuestFlowProgressStep,
  checkout: GuestCheckoutSnapshot | null,
): EventGuestFlowStep {
  if (
    progressStep === 'mp_payment' &&
    checkout !== null &&
    checkout.total_cents === 0
  ) {
    return 'message'
  }
  return progressStep
}

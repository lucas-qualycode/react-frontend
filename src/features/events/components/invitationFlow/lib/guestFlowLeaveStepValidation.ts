import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import type { GuestConfirmPhase, GuestPaymentMethodChoice } from './guestFlowDraft'
import {
  findFirstInvalidSpotIndex,
  showGuestConfirmValidationMessage,
  validateSpot,
  type GuestConfirmFormSlot,
} from './guestConfirmMock'
import { guestFlowShowsProgressIndicator, type GuestFlowProgressStep } from './guestFlowProgress'
import type { EventGuestFlowStep, GuestGiftsSubView } from '../types'
import type { GuestCardPaymentFormState } from '../../blocks/mpPayment/guestMpPaymentForm'
import { getDefaultGuestPaymentProvider } from '../../blocks/payment/registry'
import type { MercadoPagoLeaveValidationDeps } from '../../blocks/payment/types'
import type { LeaveStepValidationResult } from './guestFlowLeaveStepTypes'

export type { LeaveStepValidationFailure, LeaveStepValidationResult } from './guestFlowLeaveStepTypes'

export function eventGuestFlowStepToProgressStep(
  step: EventGuestFlowStep,
): GuestFlowProgressStep | null {
  if (!guestFlowShowsProgressIndicator(step)) return null
  return step as GuestFlowProgressStep
}

function validateLeaveGuestsStep(
  slots: GuestConfirmFormSlot[],
  confirmPhase: GuestConfirmPhase,
  confirmGuestIndex: number,
  fieldDefinitions: Parameters<typeof showGuestConfirmValidationMessage>[2],
  t: (key: string, options?: Record<string, unknown>) => string,
): LeaveStepValidationResult {
  if (confirmPhase === 'form') {
    const current = slots[confirmGuestIndex]
    if (!current) return { ok: true }
    const result = validateSpot(current, fieldDefinitions)
    if (result.valid) return { ok: true }
    showGuestConfirmValidationMessage(t, result, fieldDefinitions)
    return { ok: false, step: 'guests', validation: result, guestIndex: confirmGuestIndex }
  }

  const firstInvalid = findFirstInvalidSpotIndex(slots, fieldDefinitions)
  if (!firstInvalid) return { ok: true }
  showGuestConfirmValidationMessage(t, firstInvalid.result, fieldDefinitions)
  return {
    ok: false,
    step: 'guests',
    validation: firstInvalid.result,
    guestIndex: firstInvalid.index,
  }
}

export function validateLeaveGuestFlowStep(input: {
  activeStep: EventGuestFlowStep
  targetStep: EventGuestFlowStep
  giftsSubView: GuestGiftsSubView
  slots: GuestConfirmFormSlot[]
  confirmPhase: GuestConfirmPhase
  confirmGuestIndex: number
  fieldDefinitions: Parameters<typeof showGuestConfirmValidationMessage>[2]
  checkout: GuestCheckoutSnapshot | null
  paymentMethod: GuestPaymentMethodChoice | null
  pixPayerEmail: string
  cardPaymentForm: GuestCardPaymentFormState
  mercadoPagoLeaveDeps?: MercadoPagoLeaveValidationDeps
  t: (key: string, options?: Record<string, unknown>) => string
}): LeaveStepValidationResult {
  if (input.activeStep === input.targetStep) {
    return { ok: true }
  }

  switch (input.activeStep) {
    case 'guests':
      return validateLeaveGuestsStep(
        input.slots,
        input.confirmPhase,
        input.confirmGuestIndex,
        input.fieldDefinitions,
        input.t,
      )
    case 'gifts':
      if (input.giftsSubView !== 'payment' || !input.checkout) return { ok: true }
      {
        const paymentLeave = getDefaultGuestPaymentProvider().validateLeaveStep({
          method: input.paymentMethod,
          pixPayerEmail: input.pixPayerEmail,
          cardForm: input.cardPaymentForm,
          mercadoPago: input.mercadoPagoLeaveDeps,
          t: input.t as (key: string) => string,
        })
        if (paymentLeave.ok) return paymentLeave
        if (paymentLeave.step === 'gifts') {
          return { ok: false, step: 'gifts', fieldErrors: paymentLeave.fieldErrors }
        }
        return paymentLeave
      }
    default:
      return { ok: true }
  }
}

import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import type { GuestConfirmPhase, GuestPaymentMethodChoice } from './guestFlowDraft'
import {
  findFirstInvalidGuestSlotIndex,
  showGuestConfirmValidationMessage,
  validateGuestSlot,
  type GuestConfirmFormSlot,
} from './guestConfirmMock'
import { guestFlowShowsProgressIndicator, type GuestFlowProgressStep } from './guestFlowProgress'
import type { EventGuestFlowStep } from '../types'
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

function validateLeaveConfirmStep(
  slots: GuestConfirmFormSlot[],
  confirmPhase: GuestConfirmPhase,
  confirmGuestIndex: number,
  fieldDefinitions: Parameters<typeof showGuestConfirmValidationMessage>[2],
  t: (key: string, options?: Record<string, unknown>) => string,
): LeaveStepValidationResult {
  if (confirmPhase === 'form') {
    const current = slots[confirmGuestIndex]
    if (!current) return { ok: true }
    const result = validateGuestSlot(current)
    if (result.valid) return { ok: true }
    showGuestConfirmValidationMessage(t, result, fieldDefinitions)
    return { ok: false, step: 'confirm', validation: result, guestIndex: confirmGuestIndex }
  }

  const firstInvalid = findFirstInvalidGuestSlotIndex(slots)
  if (!firstInvalid) return { ok: true }
  showGuestConfirmValidationMessage(t, firstInvalid.result, fieldDefinitions)
  return {
    ok: false,
    step: 'confirm',
    validation: firstInvalid.result,
    guestIndex: firstInvalid.index,
  }
}

export function validateLeaveGuestFlowStep(input: {
  activeStep: EventGuestFlowStep
  targetStep: EventGuestFlowStep
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
    case 'confirm':
      return validateLeaveConfirmStep(
        input.slots,
        input.confirmPhase,
        input.confirmGuestIndex,
        input.fieldDefinitions,
        input.t,
      )
    case 'mp_payment':
      if (!input.checkout) return { ok: true }
      return getDefaultGuestPaymentProvider().validateLeaveStep({
        method: input.paymentMethod,
        pixPayerEmail: input.pixPayerEmail,
        cardForm: input.cardPaymentForm,
        mercadoPago: input.mercadoPagoLeaveDeps,
        t: input.t as (key: string) => string,
      })
    default:
      return { ok: true }
  }
}

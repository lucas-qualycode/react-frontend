import { message } from 'antd'
import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import type { GuestConfirmPhase, GuestPaymentMethodChoice } from './guestFlowDraft'
import {
  findFirstInvalidGuestSlotIndex,
  showGuestConfirmValidationMessage,
  validateGuestSlot,
  type GuestConfirmFormSlot,
  type GuestSlotValidationResult,
} from './guestConfirmMock'
import { guestFlowShowsProgressIndicator, type GuestFlowProgressStep } from './guestFlowProgress'
import type { EventGuestFlowStep } from '../types'
import {
  validateCardPaymentForm,
  type CardFormValidation,
  type GuestCardPaymentFormState,
} from '../../blocks/mpPayment/guestMpPaymentForm'

export type LeaveStepValidationFailure =
  | {
      step: 'confirm'
      validation: GuestSlotValidationResult
      guestIndex: number
    }
  | {
      step: 'mp_payment'
      fieldErrors: CardFormValidation['fieldErrors']
    }

export type LeaveStepValidationResult =
  | { ok: true }
  | ({ ok: false } & LeaveStepValidationFailure)

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

function validateLeaveMpPaymentStep(
  method: GuestPaymentMethodChoice | null,
  pixPayerEmail: string,
  cardForm: GuestCardPaymentFormState,
  isMpConfigured: boolean,
  isMpReady: boolean,
  t: (key: string) => string,
): LeaveStepValidationResult {
  if (!method) {
    message.warning(t('events.detail.guestMpPayment.validation.chooseMethod'))
    return { ok: false, step: 'mp_payment', fieldErrors: {} }
  }

  if (method === 'pix') {
    const email = pixPayerEmail.trim()
    if (!email) {
      message.error(t('events.detail.guestMpPayment.validation.required'))
      return { ok: false, step: 'mp_payment', fieldErrors: {} }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.error(t('events.detail.guestMpPayment.validation.emailInvalid'))
      return { ok: false, step: 'mp_payment', fieldErrors: {} }
    }
    return { ok: true }
  }

  const validation = validateCardPaymentForm(cardForm, t, {
    requirePaymentMethod: isMpConfigured && isMpReady,
  })
  if (!validation.valid) {
    message.error(t('events.detail.guestMpPayment.validation.formInvalid'))
    return { ok: false, step: 'mp_payment', fieldErrors: validation.fieldErrors }
  }

  if (isMpConfigured && !isMpReady) {
    message.error(t('events.detail.guestMpPayment.validation.mpNotReady'))
    return { ok: false, step: 'mp_payment', fieldErrors: {} }
  }

  return { ok: true }
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
  isMpConfigured: boolean
  isMpReady: boolean
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
      return validateLeaveMpPaymentStep(
        input.paymentMethod,
        input.pixPayerEmail,
        input.cardPaymentForm,
        input.isMpConfigured,
        input.isMpReady,
        input.t as (key: string) => string,
      )
    default:
      return { ok: true }
  }
}

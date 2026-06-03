import type { CardFormValidation } from '../../blocks/mpPayment/guestMpPaymentForm'
import type { GuestSlotValidationResult } from './guestConfirmMock'

export type LeaveStepValidationFailure =
  | {
      step: 'guests'
      validation: GuestSlotValidationResult
      guestIndex: number
    }
  | {
      step: 'gifts'
      fieldErrors: CardFormValidation['fieldErrors']
    }

export type LeaveStepValidationResult =
  | { ok: true }
  | ({ ok: false } & LeaveStepValidationFailure)

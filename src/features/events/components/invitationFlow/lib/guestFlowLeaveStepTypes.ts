import type { CardFormValidation } from '../../blocks/mpPayment/guestMpPaymentForm'
import type { GuestSlotValidationResult } from './guestConfirmMock'

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

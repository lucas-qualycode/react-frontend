import type { CardFormValidation } from '../../blocks/mpPayment/guestMpPaymentForm'
import type { SpotValidationResult } from './guestConfirmMock'

export type LeaveStepValidationFailure =
  | {
      step: 'guests'
      validation: SpotValidationResult
      guestIndex: number
    }
  | {
      step: 'gifts'
      fieldErrors: CardFormValidation['fieldErrors']
    }

export type LeaveStepValidationResult =
  | { ok: true }
  | ({ ok: false } & LeaveStepValidationFailure)

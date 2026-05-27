import { message } from 'antd'
import {
  validateCardPaymentForm,
  type GuestCardPaymentFormState,
} from '../../blocks/mpPayment/guestMpPaymentForm'
import type { LeaveStepValidationResult } from '../../invitationFlow/lib/guestFlowLeaveStepValidation'
import type { GuestPaymentLeaveValidationInput } from '../../blocks/payment/types'

export function validateLeaveMercadoPagoPaymentStep(
  input: GuestPaymentLeaveValidationInput,
): LeaveStepValidationResult {
  const { method, pixPayerEmail, cardForm, mercadoPago, t } = input
  const isConfigured = mercadoPago?.isConfigured ?? false
  const isReady = mercadoPago?.isReady ?? false

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

  const validation = validateCardPaymentForm(cardForm as GuestCardPaymentFormState, t, {
    requirePaymentMethod: isConfigured && isReady,
  })
  if (!validation.valid) {
    message.error(t('events.detail.guestMpPayment.validation.formInvalid'))
    return { ok: false, step: 'mp_payment', fieldErrors: validation.fieldErrors }
  }

  if (isConfigured && !isReady) {
    message.error(t('events.detail.guestMpPayment.validation.mpNotReady'))
    return { ok: false, step: 'mp_payment', fieldErrors: {} }
  }

  return { ok: true }
}

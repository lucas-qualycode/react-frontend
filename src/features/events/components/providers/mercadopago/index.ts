import { EventGuestMpPaymentBlock } from '../../blocks/mpPayment/EventGuestMpPaymentBlock'
import type { GuestPaymentProviderModule } from '../../blocks/payment/types'
import { GUEST_PAYMENT_PROVIDER_MERCADOPAGO } from '../../invitationFlow/lib/guestPaymentProvider'
import { finalizeMercadoPagoGuestPayment } from './finalize'
import {
  MercadoPagoPaymentReviewSectionShell,
} from './MercadoPagoPaymentReviewSection'
import { validateLeaveMercadoPagoPaymentStep } from './validateLeaveStep'

export const mercadoPagoGuestPaymentProvider: GuestPaymentProviderModule = {
  id: GUEST_PAYMENT_PROVIDER_MERCADOPAGO,
  PaymentBlock: EventGuestMpPaymentBlock,
  finalizeCheckout: finalizeMercadoPagoGuestPayment,
  validateLeaveStep: validateLeaveMercadoPagoPaymentStep,
  PaymentReviewSection: MercadoPagoPaymentReviewSectionShell,
}

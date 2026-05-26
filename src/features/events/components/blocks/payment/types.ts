import type { ComponentType } from 'react'
import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import type { GuestPaymentProviderId } from '../../invitationFlow/lib/guestPaymentProvider'
import type {
  GuestCardPaymentPersisted,
  GuestMpPaymentSnapshot,
} from '../mpPayment/guestMpPaymentDraft'
import type { GuestCardPaymentSecrets } from '../mpPayment/guestMpPaymentForm'
import type { GuestMpCardTokenResult } from '../mpPayment/guestMpPaymentDraft'
import type { EventGuestMpPaymentVariant } from '../../invitationFlow/types'
import type { Event } from '@/shared/types/api'
import type { GuestPaymentMethodChoice } from '../../invitationFlow/lib/guestFlowDraft'
import type { CardFormValidation } from '../mpPayment/guestMpPaymentForm'
import type { LeaveStepValidationResult } from '../../invitationFlow/lib/guestFlowLeaveStepTypes'

export type GuestPaymentSnapshot = GuestMpPaymentSnapshot

export type GuestPaymentFinalizeResult = {
  payment_provider: GuestPaymentProviderId
  provider_checkout: unknown
}

export type GuestPaymentFinalizeContext = {
  cardSecrets?: GuestCardPaymentSecrets
  createCardToken?: (
    form: GuestCardPaymentPersisted & GuestCardPaymentSecrets,
  ) => Promise<GuestMpCardTokenResult>
  canCreateCardToken?: boolean
}

export type GuestCheckoutPayload = GuestCheckoutSnapshot & {
  invitation_id: string
  payment_provider: GuestPaymentProviderId
  provider_checkout: unknown
}

export type GuestPaymentBlockProps = {
  event: Event
  variant: EventGuestMpPaymentVariant
  checkout: GuestCheckoutSnapshot
  method: GuestPaymentMethodChoice | null
  onMethodChange: (method: GuestPaymentMethodChoice | null) => void
  pixPayerEmail: string
  onPixPayerEmailChange: (email: string) => void
  cardPayment: GuestCardPaymentPersisted
  onCardPaymentChange: (card: GuestCardPaymentPersisted) => void
  cardSecrets: GuestCardPaymentSecrets
  onCardSecretsChange: (secrets: GuestCardPaymentSecrets) => void
  onPaymentComplete: (snapshot: GuestPaymentSnapshot) => void
  onBack: () => void
  navigationFieldErrors?: CardFormValidation['fieldErrors']
  onNavigationFieldErrorsClear?: () => void
}

export type GuestPaymentReviewSectionProps = {
  checkout: GuestCheckoutSnapshot | null
  paymentSnapshot: GuestPaymentSnapshot | null
  cardPayment: GuestCardPaymentPersisted
  editLabel?: string
  onEdit?: () => void
}

export type MercadoPagoLeaveValidationDeps = {
  isConfigured: boolean
  isReady: boolean
}

export type GuestPaymentLeaveValidationInput = {
  method: GuestPaymentMethodChoice | null
  pixPayerEmail: string
  cardForm: GuestCardPaymentPersisted & GuestCardPaymentSecrets
  mercadoPago?: MercadoPagoLeaveValidationDeps
  t: (key: string) => string
}

export type GuestPaymentProviderModule = {
  id: GuestPaymentProviderId
  PaymentBlock: ComponentType<GuestPaymentBlockProps>
  finalizeCheckout: (
    checkout: GuestCheckoutSnapshot,
    snapshot: GuestPaymentSnapshot,
    context: GuestPaymentFinalizeContext,
  ) => Promise<GuestPaymentFinalizeResult>
  validateLeaveStep: (input: GuestPaymentLeaveValidationInput) => LeaveStepValidationResult
  PaymentReviewSection: ComponentType<GuestPaymentReviewSectionProps>
}

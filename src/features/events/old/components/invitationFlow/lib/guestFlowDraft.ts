import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import type { GuestConfirmFormSlot } from './guestConfirmMock'
import {
  createDefaultCardPaymentPersisted,
  type GuestCardPaymentPersisted,
  type GuestMpCardPaymentTypeId,
} from '../../blocks/mpPayment/guestMpPaymentDraft'
import type { EventGuestFlowStep } from '../types'

export const GUEST_FLOW_DRAFT_VERSION = 6 as const
export const GUEST_FLOW_DRAFT_STORAGE_PREFIX = 'partiiu:guest-flow:'
export const GUEST_WIZARD_STEP_STORAGE_PREFIX = 'partiiu:wizard-step:'
export const GUEST_FLOW_DRAFT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

export type GuestFlowPath = 'attend' | 'decline'

export type GuestMessagePhase = 'email' | 'compose'

export type GuestConfirmPhase = 'form' | 'review'

export type GuestGiftPhase = 'browse' | 'review'

export type { GuestMpCardPaymentTypeId }

export type GuestPaymentMethodChoice = GuestMpCardPaymentTypeId | 'pix'

export function isGuestCardPaymentMethod(
  method: GuestPaymentMethodChoice | null,
): method is GuestMpCardPaymentTypeId {
  return method === 'credit_card' || method === 'debit_card'
}

export function paymentTypeIdForGuestMethod(
  method: GuestPaymentMethodChoice | null,
): GuestMpCardPaymentTypeId | null {
  if (method === 'credit_card' || method === 'debit_card') return method
  return null
}

export type GuestPendingCheckout = {
  paymentId: string
  orderId: string
  idempotencyKey?: string | null
}

export type GuestFlowDraft = {
  version: typeof GUEST_FLOW_DRAFT_VERSION
  invitationId: string
  eventId: string
  updatedAt: string
  flowPath: GuestFlowPath
  activeStep: EventGuestFlowStep
  guestSlots: GuestConfirmFormSlot[]
  confirmPhase: GuestConfirmPhase
  confirmGuestIndex: number
  selectedProductIds: string[]
  giftPhase: GuestGiftPhase
  giftPage: number
  checkout: GuestCheckoutSnapshot | null
  pendingCheckout?: GuestPendingCheckout | null
  coupleMessage: string
  guestEmail: string
  messagePhase: GuestMessagePhase
  giftCapturedEmail: string
  paymentMethod: GuestPaymentMethodChoice | null
  pixPayerEmail: string
  cardPayment: GuestCardPaymentPersisted
  guestsSaved?: boolean
  messageSaved?: boolean
  lastSavedGuestsFingerprint?: string | null
  lastSavedMessage?: string | null
}

export type GuestFlowDraftState = Omit<GuestFlowDraft, 'version' | 'invitationId' | 'eventId' | 'updatedAt'>

export function createDefaultGuestFlowDraftState(): GuestFlowDraftState {
  return {
    flowPath: 'attend',
    activeStep: 'welcome' as EventGuestFlowStep,
    guestSlots: [],
    confirmPhase: 'form',
    confirmGuestIndex: 0,
    selectedProductIds: [],
    giftPhase: 'browse',
    giftPage: 0,
    checkout: null,
    pendingCheckout: null,
    coupleMessage: '',
    guestEmail: '',
    messagePhase: 'email',
    giftCapturedEmail: '',
    paymentMethod: null,
    pixPayerEmail: '',
    cardPayment: createDefaultCardPaymentPersisted(),
    guestsSaved: false,
    messageSaved: false,
    lastSavedGuestsFingerprint: null,
    lastSavedMessage: null,
  }
}

export function guestFlowDraftStorageKey(invitationId: string): string {
  return `${GUEST_FLOW_DRAFT_STORAGE_PREFIX}${invitationId}`
}

export function guestWizardStepStorageKey(invitationId: string): string {
  return `${GUEST_WIZARD_STEP_STORAGE_PREFIX}${invitationId}`
}

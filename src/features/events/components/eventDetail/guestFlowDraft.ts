import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import type { GuestConfirmFormSlot } from './guestConfirmMock'
import { createDefaultCardPaymentPersisted, type GuestCardPaymentPersisted } from './guestMpPaymentDraft'
import type { EventGuestFlowStep } from './types'

export const GUEST_FLOW_DRAFT_VERSION = 2 as const
export const GUEST_FLOW_DRAFT_STORAGE_PREFIX = 'partiiu:guest-flow:'
export const GUEST_FLOW_DRAFT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

export type GuestFlowPath = 'attend' | 'decline'

export type GuestConfirmPhase = 'form' | 'review'

export type GuestGiftPhase = 'browse' | 'review'

export type GuestPaymentMethodChoice = 'card' | 'pix'

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
  coupleMessage: string
  declineMessage: string
  paymentMethod: GuestPaymentMethodChoice | null
  pixPayerEmail: string
  cardPayment: GuestCardPaymentPersisted
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
    coupleMessage: '',
    declineMessage: '',
    paymentMethod: null,
    pixPayerEmail: '',
    cardPayment: createDefaultCardPaymentPersisted(),
  }
}

export function guestFlowDraftStorageKey(invitationId: string): string {
  return `${GUEST_FLOW_DRAFT_STORAGE_PREFIX}${invitationId}`
}

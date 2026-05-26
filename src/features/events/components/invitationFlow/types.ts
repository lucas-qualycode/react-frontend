export type EventDetailBlockId =
  | 'guest_background'
  | 'guest_welcome'
  | 'guest_confirm'
  | 'guest_gift'
  | 'guest_mp_payment'
  | 'guest_message'
  | 'guest_review'

export type EventGuestBackgroundVariant = 'wedding'

export type EventGuestWelcomeVariant = 'wedding'

export type EventGuestConfirmVariant = 'wedding'

export type EventGuestGiftVariant = 'wedding'

export type EventGuestMpPaymentVariant = 'wedding'

export type EventGuestMessageVariant = 'wedding'

export type EventGuestReviewVariant = 'wedding'

export type EventDetailSlot = { blockId: 'guest_welcome'; variant: EventGuestWelcomeVariant }

export type EventGuestFlowStep =
  | 'welcome'
  | 'confirm'
  | 'gift'
  | 'mp_payment'
  | 'message'
  | 'review'

export const GUEST_FLOW_STEP_INDEX: Record<EventGuestFlowStep, number> = {
  welcome: 0,
  confirm: 1,
  gift: 2,
  mp_payment: 3,
  message: 4,
  review: 5,
}

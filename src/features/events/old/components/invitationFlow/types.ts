export type EventDetailBlockId =
  | 'guest_background'
  | 'guest_welcome'
  | 'guest_guests'
  | 'guest_gifts'
  | 'guest_message'
  | 'guest_finished'

export type EventGuestBackgroundVariant = 'wedding'

export type EventGuestWelcomeVariant = 'wedding'

export type EventGuestGuestsVariant = 'wedding'

export type EventGuestConfirmVariant = EventGuestGuestsVariant

export type EventGuestGiftsVariant = 'wedding'

export type EventGuestGiftVariant = EventGuestGiftsVariant

export type EventGuestMpPaymentVariant = 'wedding'

export type EventGuestPaymentVariant = 'wedding'

export type EventGuestMessageVariant = 'wedding'

export type EventGuestFinishedVariant = 'wedding'

export type EventGuestReviewVariant = EventGuestFinishedVariant

export type EventDetailSlot = { blockId: 'guest_welcome'; variant: EventGuestWelcomeVariant }

export type EventGuestFlowStep =
  | 'welcome'
  | 'guests'
  | 'gifts'
  | 'message'
  | 'finished'

export const GUEST_FLOW_STEP_INDEX: Record<EventGuestFlowStep, number> = {
  welcome: 0,
  guests: 1,
  gifts: 2,
  message: 3,
  finished: 4,
}

export type GuestGiftsSubView = 'catalog' | 'payment' | 'payment_poll'

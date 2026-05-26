import type { GuestFlowDraft, GuestFlowDraftState } from './guestFlowDraft'
import { mergeGuestSlotsWithDraft } from './guestFlowDraftStorage'
import type { Invitation, Product } from '@/shared/types/api'
import {
  buildGuestSlotsSubmitPayload,
  fingerprintGuestMessage,
  fingerprintGuestSlotsSubmitPayload,
} from './guestSubmitPayload'
import { buildInitialGuestConfirmSlots } from './guestConfirmMock'
import { GUEST_MESSAGE_METADATA_KEY } from './guestRsvpConstants'

export type GuestRsvpPersistFlags = {
  guestsSaved: boolean
  messageSaved: boolean
  lastSavedGuestsFingerprint: string | null
  lastSavedMessage: string | null
}

export function readGuestMessageFromInvitation(invitation: Invitation): string {
  const raw = invitation.metadata?.[GUEST_MESSAGE_METADATA_KEY]
  return typeof raw === 'string' ? raw.trim() : ''
}

export function invitationHasPersistedGuestRsvp(invitation: Invitation): boolean {
  const slots = invitation.guest_slots ?? []
  return slots.some((slot) => {
    if (slot.attending === false) return true
    const values = slot.field_values ?? {}
    return Object.values(values).some((v) => Boolean(String(v).trim()))
  })
}

export function buildRsvpPersistFlagsFromInvitation(
  invitation: Invitation,
  ticket: Product,
): GuestRsvpPersistFlags {
  const guestsSaved = invitationHasPersistedGuestRsvp(invitation)
  const savedMessage = readGuestMessageFromInvitation(invitation)
  const messageSaved = savedMessage.length > 0

  const lastSavedGuestsFingerprint = guestsSaved
    ? fingerprintGuestSlotsSubmitPayload(
        buildGuestSlotsSubmitPayload(buildInitialGuestConfirmSlots(invitation, ticket)),
      )
    : null

  return {
    guestsSaved,
    messageSaved,
    lastSavedGuestsFingerprint,
    lastSavedMessage: messageSaved ? fingerprintGuestMessage(savedMessage) : null,
  }
}

export function mergeDraftWithServerState(
  draft: GuestFlowDraft,
  invitation: Invitation,
  ticket: Product,
): GuestFlowDraftState {
  const serverSlots = buildInitialGuestConfirmSlots(invitation, ticket)
  const serverFlags = buildRsvpPersistFlagsFromInvitation(invitation, ticket)
  const savedMessage = readGuestMessageFromInvitation(invitation)

  const useServerGuests =
    Boolean(draft.guestsSaved) ||
    serverFlags.guestsSaved ||
    invitationHasPersistedGuestRsvp(invitation)

  const guestSlots = useServerGuests
    ? serverSlots
    : mergeGuestSlotsWithDraft(serverSlots, draft.guestSlots)

  const useServerMessage =
    Boolean(draft.messageSaved) || serverFlags.messageSaved || savedMessage.length > 0

  return {
    flowPath: draft.flowPath,
    activeStep: draft.activeStep,
    guestSlots,
    confirmPhase: draft.confirmPhase,
    confirmGuestIndex: draft.confirmGuestIndex,
    selectedProductIds: draft.selectedProductIds,
    giftPhase: draft.giftPhase,
    giftPage: draft.giftPage,
    checkout: draft.checkout?.parent_id === draft.eventId ? draft.checkout : null,
    coupleMessage: useServerMessage ? savedMessage : draft.coupleMessage,
    paymentMethod: draft.paymentMethod,
    pixPayerEmail: draft.pixPayerEmail,
    cardPayment: draft.cardPayment,
    guestsSaved: draft.guestsSaved ?? serverFlags.guestsSaved,
    messageSaved: draft.messageSaved ?? serverFlags.messageSaved,
    lastSavedGuestsFingerprint:
      draft.lastSavedGuestsFingerprint ?? serverFlags.lastSavedGuestsFingerprint,
    lastSavedMessage: draft.lastSavedMessage ?? serverFlags.lastSavedMessage,
  }
}

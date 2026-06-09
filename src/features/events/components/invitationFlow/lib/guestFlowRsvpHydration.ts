import type { Invitation } from '@/shared/types/api'
import {
  buildGuestMessageSubmitPayload,
  buildSpotsSubmitPayload,
  fingerprintGuestMessagePayload,
  fingerprintSpotsSubmitPayload,
} from './guestSubmitPayload'
import { mergeSpotsWithDraft } from './guestFlowDraftStorage'
import type { GuestFlowDraft, GuestFlowDraftState, GuestMessagePhase } from './guestFlowDraft'
import { buildInitialGuestConfirmSlots } from './guestConfirmMock'
import { GUEST_EMAIL_METADATA_KEY, GUEST_MESSAGE_METADATA_KEY } from './guestRsvpConstants'
import { isValidGuestEmail, resolveMessagePhase } from './guestMessageEmail'

export type GuestRsvpPersistFlags = {
  guestsSaved: boolean
  messageSaved: boolean
  lastSavedGuestsFingerprint: string | null
  lastSavedMessage: string | null
}

export function readGuestMessageFromInvitation(invitation: Invitation): string {
  const metadata = invitation.metadata ?? {}
  const fromMessage = metadata[GUEST_MESSAGE_METADATA_KEY]
  if (typeof fromMessage === 'string' && fromMessage.trim()) {
    return fromMessage.trim()
  }
  const legacy = metadata.guest_message
  return typeof legacy === 'string' ? legacy.trim() : ''
}

export function readGuestEmailFromInvitation(invitation: Invitation): string {
  const metadata = invitation.metadata ?? {}
  const raw = metadata[GUEST_EMAIL_METADATA_KEY]
  return typeof raw === 'string' ? raw.trim() : ''
}

export function invitationHasPersistedGuestRsvp(invitation: Invitation): boolean {
  const slots = invitation.spots ?? []
  return slots.some((slot) => {
    if (slot.id && slot.name?.trim()) return true
    if (slot.attending === false) return true
    const values = slot.field_values ?? {}
    return Object.values(values).some((v) => Boolean(String(v).trim()))
  })
}

export function buildRsvpPersistFlagsFromInvitation(
  invitation: Invitation,
): GuestRsvpPersistFlags {
  const guestsSaved = invitationHasPersistedGuestRsvp(invitation)
  const savedMessage = readGuestMessageFromInvitation(invitation)
  const savedEmail = readGuestEmailFromInvitation(invitation)
  const messageSaved = savedEmail.length > 0

  const lastSavedGuestsFingerprint = guestsSaved
    ? fingerprintSpotsSubmitPayload(
        buildSpotsSubmitPayload(buildInitialGuestConfirmSlots(invitation)),
      )
    : null

  return {
    guestsSaved,
    messageSaved,
    lastSavedGuestsFingerprint,
    lastSavedMessage: messageSaved
      ? fingerprintGuestMessagePayload(
          buildGuestMessageSubmitPayload(savedMessage, savedEmail),
        )
      : null,
  }
}

function resolveHydratedGuestEmail(
  invitation: Invitation,
  draftEmail: string | undefined,
  giftCapturedEmail: string | undefined,
): string {
  const fromServer = readGuestEmailFromInvitation(invitation)
  if (fromServer) return fromServer
  const fromDraft = draftEmail?.trim() ?? ''
  if (fromDraft) return fromDraft
  const fromGift = giftCapturedEmail?.trim() ?? ''
  if (isValidGuestEmail(fromGift)) return fromGift
  return ''
}

function resolveHydratedMessagePhase(
  guestEmail: string,
  giftCapturedEmail: string,
  draftPhase: GuestMessagePhase | undefined,
): GuestMessagePhase {
  return resolveMessagePhase({
    guestEmail,
    giftCapturedEmail,
    draftPhase,
  })
}

export function mergeDraftWithServerState(
  draft: GuestFlowDraft,
  invitation: Invitation,
): GuestFlowDraftState {
  const serverSlots = buildInitialGuestConfirmSlots(invitation)
  const serverFlags = buildRsvpPersistFlagsFromInvitation(invitation)
  const savedMessage = readGuestMessageFromInvitation(invitation)
  const savedEmail = readGuestEmailFromInvitation(invitation)
  const giftCapturedEmail = draft.giftCapturedEmail ?? ''

  const useServerGuests =
    Boolean(draft.guestsSaved) ||
    serverFlags.guestsSaved ||
    invitationHasPersistedGuestRsvp(invitation)

  const spots = useServerGuests
    ? serverSlots
    : mergeSpotsWithDraft(serverSlots, draft.spots)

  const useServerMessage =
    Boolean(draft.messageSaved) || serverFlags.messageSaved || savedEmail.length > 0

  const guestEmail = useServerMessage
    ? savedEmail
    : resolveHydratedGuestEmail(invitation, draft.guestEmail, giftCapturedEmail)

  const messagePhase = resolveHydratedMessagePhase(
    guestEmail,
    giftCapturedEmail,
    draft.messagePhase,
  )

  return {
    flowPath: draft.flowPath,
    activeStep: draft.activeStep,
    spots,
    confirmPhase: draft.confirmPhase,
    confirmGuestIndex: draft.confirmGuestIndex,
    selectedProductIds: draft.selectedProductIds,
    giftPhase: draft.giftPhase,
    giftPage: draft.giftPage,
    checkout: draft.checkout?.parent_id === draft.eventId ? draft.checkout : null,
    coupleMessage: useServerMessage ? savedMessage : draft.coupleMessage,
    guestEmail,
    messagePhase,
    giftCapturedEmail,
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

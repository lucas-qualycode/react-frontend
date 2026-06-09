import { useEffect, useRef } from 'react'
import type { Invitation, Product } from '@/shared/types/api'
import { buildCheckoutSnapshotFromProducts } from '../lib/guestCheckoutSession'
import {
  buildInitialGuestConfirmSlots,
  markAllGuestsNotAttending,
} from '../lib/guestConfirmMock'
import {
  GUEST_FLOW_DRAFT_VERSION,
  createDefaultGuestFlowDraftState,
  type GuestFlowDraft,
  type GuestFlowDraftState,
} from '../lib/guestFlowDraft'
import { createDefaultCardPaymentPersisted } from '../../blocks/mpPayment/guestMpPaymentDraft'
import {
  buildRsvpPersistFlagsFromInvitation,
  mergeDraftWithServerState,
  readGuestEmailFromInvitation,
  readGuestMessageFromInvitation,
} from '../lib/guestFlowRsvpHydration'
import { resolveMessagePhase } from '../lib/guestMessageEmail'
import { resolveWizardStepFromInvitation } from '../lib/resolveWizardStep'
import {
  clearGuestFlowDraft,
  loadGuestFlowDraft,
  saveGuestFlowDraft,
} from '../lib/guestFlowDraftStorage'

export type GuestFlowHydrationPayload = GuestFlowDraftState

type Params = {
  invitationId: string | undefined
  eventId: string
  invitation: Invitation | null
  ticket: Product | null
  isReady: boolean
  state: GuestFlowDraftState
  draftHydrated: boolean
  onHydrate: (payload: GuestFlowHydrationPayload) => void
  onDraftHydrated: () => void
}

function buildDraftFromState(
  invitationId: string,
  eventId: string,
  state: GuestFlowDraftState,
): GuestFlowDraft {
  return {
    version: GUEST_FLOW_DRAFT_VERSION,
    invitationId,
    eventId,
    updatedAt: new Date().toISOString(),
    ...state,
  }
}

function resolveInitialWizardStep(
  invitation: Invitation,
  draft: GuestFlowDraft | null,
): GuestFlowHydrationPayload['activeStep'] {
  if (draft?.flowPath === 'decline') {
    return 'guests'
  }
  return resolveWizardStepFromInvitation(invitation)
}

function hydrationFromDraft(
  draft: GuestFlowDraft,
  invitation: Invitation,
): GuestFlowHydrationPayload {
  const merged = mergeDraftWithServerState(draft, invitation)
  const initialSlots = buildInitialGuestConfirmSlots(invitation)
  const declinedPath = draft.flowPath === 'decline'
  const spots = declinedPath
    ? markAllGuestsNotAttending(merged.spots)
    : merged.spots
  const confirmPhase = declinedPath ? 'review' : merged.confirmPhase
  const confirmGuestIndex = declinedPath
    ? Math.max(0, spots.length - 1)
    : Math.min(Math.max(0, draft.confirmGuestIndex), Math.max(0, initialSlots.length - 1))

  return {
    ...merged,
    spots,
    confirmPhase,
    confirmGuestIndex,
    activeStep: resolveInitialWizardStep(invitation, draft),
    cardPayment: {
      ...createDefaultCardPaymentPersisted(),
      ...draft.cardPayment,
    },
  }
}


function hydrationWithoutDraft(
  invitation: Invitation,
): GuestFlowHydrationPayload {
  const serverFlags = buildRsvpPersistFlagsFromInvitation(invitation)
  const savedMessage = readGuestMessageFromInvitation(invitation)
  const savedEmail = readGuestEmailFromInvitation(invitation)
  const guestEmail = savedEmail
  const messagePhase = resolveMessagePhase({ guestEmail, giftCapturedEmail: '' })

  return {
    ...createDefaultGuestFlowDraftState(),
    activeStep: resolveInitialWizardStep(invitation, null),
    spots: buildInitialGuestConfirmSlots(invitation),
    coupleMessage: savedMessage,
    guestEmail,
    messagePhase,
    guestsSaved: serverFlags.guestsSaved,
    messageSaved: serverFlags.messageSaved,
    lastSavedGuestsFingerprint: serverFlags.lastSavedGuestsFingerprint,
    lastSavedMessage: serverFlags.lastSavedMessage,
  }
}

export function useGuestFlowDraft({
  invitationId,
  eventId,
  invitation,
  ticket,
  isReady,
  state,
  draftHydrated,
  onHydrate,
  onDraftHydrated,
}: Params) {
  const hydrateStartedRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!isReady || !invitation || !ticket || hydrateStartedRef.current) return
    hydrateStartedRef.current = true

    const draftKey = invitationId ?? invitation.id
    const draft = loadGuestFlowDraft(draftKey, eventId)
    if (draft) {
      onHydrate(hydrationFromDraft(draft, invitation))
    } else {
      onHydrate(hydrationWithoutDraft(invitation))
    }
    onDraftHydrated()
  }, [eventId, invitation, invitationId, isReady, onDraftHydrated, onHydrate, ticket])

  useEffect(() => {
    if (!draftHydrated || !invitation) return

    const draftKey = invitationId ?? invitation.id
    const timeoutId = window.setTimeout(() => {
      saveGuestFlowDraft(buildDraftFromState(draftKey, eventId, stateRef.current))
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [draftHydrated, eventId, invitation, invitationId, state])

  const clearDraft = () => {
    const draftKey = invitationId ?? invitation?.id
    if (draftKey) clearGuestFlowDraft(draftKey)
  }

  return { clearDraft }
}

export function rebuildCheckoutFromSelectedProducts(
  eventId: string,
  selectedProductIds: string[],
  products: Product[],
): GuestFlowDraftState['checkout'] {
  if (selectedProductIds.length === 0) {
    return buildCheckoutSnapshotFromProducts(eventId, [])
  }
  const selected = products.filter((p) => selectedProductIds.includes(p.id))
  return buildCheckoutSnapshotFromProducts(eventId, selected)
}

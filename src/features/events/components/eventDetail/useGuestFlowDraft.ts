import { useEffect, useRef } from 'react'
import type { Invitation, Product } from '@/shared/types/api'
import { buildCheckoutSnapshotFromProducts } from './guestCheckoutSession'
import { buildInitialGuestConfirmSlots } from './guestConfirmMock'
import {
  GUEST_FLOW_DRAFT_VERSION,
  createDefaultGuestFlowDraftState,
  type GuestFlowDraft,
  type GuestFlowDraftState,
} from './guestFlowDraft'
import { createDefaultCardPaymentPersisted } from './guestMpPaymentDraft'
import {
  clearGuestFlowDraft,
  loadGuestFlowDraft,
  mergeGuestSlotsWithDraft,
  resolveGuestFlowStepFromDraft,
  saveGuestFlowDraft,
} from './guestFlowDraftStorage'

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

function hydrationFromDraft(
  draft: GuestFlowDraft,
  invitation: Invitation,
  ticket: Product,
): GuestFlowHydrationPayload {
  const initialSlots = buildInitialGuestConfirmSlots(invitation, ticket)

  return {
    flowPath: draft.flowPath,
    activeStep: resolveGuestFlowStepFromDraft(draft),
    guestSlots: mergeGuestSlotsWithDraft(initialSlots, draft.guestSlots),
    confirmPhase: draft.confirmPhase,
    confirmGuestIndex: Math.min(
      Math.max(0, draft.confirmGuestIndex),
      Math.max(0, initialSlots.length - 1),
    ),
    selectedProductIds: draft.selectedProductIds,
    giftPhase: draft.giftPhase,
    giftPage: draft.giftPage,
    checkout: draft.checkout?.eventId === draft.eventId ? draft.checkout : null,
    coupleMessage: draft.coupleMessage,
    declineMessage: draft.declineMessage,
    paymentMethod: draft.paymentMethod,
    pixPayerEmail: draft.pixPayerEmail,
    cardPayment: {
      ...createDefaultCardPaymentPersisted(),
      ...draft.cardPayment,
    },
  }
}

function hydrationWithoutDraft(
  invitation: Invitation,
  ticket: Product,
): GuestFlowHydrationPayload {
  return {
    ...createDefaultGuestFlowDraftState(),
    activeStep: 'welcome',
    guestSlots: buildInitialGuestConfirmSlots(invitation, ticket),
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
      onHydrate(hydrationFromDraft(draft, invitation, ticket))
    } else {
      onHydrate(hydrationWithoutDraft(invitation, ticket))
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

import type { GuestConfirmFormSlot } from './guestConfirmMock'
import {
  GUEST_FLOW_DRAFT_MAX_AGE_MS,
  GUEST_FLOW_DRAFT_VERSION,
  type GuestFlowDraft,
  guestFlowDraftStorageKey,
} from './guestFlowDraft'
import { GUEST_FLOW_STEP_INDEX, type EventGuestFlowStep } from './types'

export function mergeGuestSlotsWithDraft(
  initialSlots: GuestConfirmFormSlot[],
  draftSlots: GuestConfirmFormSlot[] | undefined,
): GuestConfirmFormSlot[] {
  const safeDraft = draftSlots ?? []

  return initialSlots.map((initial, index) => {
    const draft = safeDraft[index]
    if (!draft) return initial

    const fieldValues = { ...initial.fieldValues }
    for (const fieldId of initial.requiredFieldIds) {
      const value = draft.fieldValues?.[fieldId]
      if (value !== undefined) {
        fieldValues[fieldId] = value
      }
    }
    for (const [fieldId, value] of Object.entries(draft.fieldValues ?? {})) {
      if (value !== undefined) {
        fieldValues[fieldId] = value
      }
    }

    return {
      ...initial,
      firstName: initial.hasPresetName ? initial.firstName : (draft.firstName ?? initial.firstName),
      fieldValues,
      attending: draft.attending ?? initial.attending,
    }
  })
}

export function loadGuestFlowDraft(
  invitationId: string,
  eventId: string,
): GuestFlowDraft | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(guestFlowDraftStorageKey(invitationId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as GuestFlowDraft
    if (parsed.version !== GUEST_FLOW_DRAFT_VERSION) return null
    if (parsed.invitationId !== invitationId || parsed.eventId !== eventId) return null

    const updatedAt = Date.parse(parsed.updatedAt)
    if (Number.isNaN(updatedAt) || Date.now() - updatedAt > GUEST_FLOW_DRAFT_MAX_AGE_MS) {
      clearGuestFlowDraft(invitationId)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveGuestFlowDraft(draft: GuestFlowDraft): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(guestFlowDraftStorageKey(draft.invitationId), JSON.stringify(draft))
  } catch {
    // quota exceeded or private mode
  }
}

export function clearGuestFlowDraft(invitationId: string): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.removeItem(guestFlowDraftStorageKey(invitationId))
  } catch {
    // ignore
  }
}

export function resolveGuestFlowStepFromDraft(draft: GuestFlowDraft): EventGuestFlowStep {
  if (draft.flowPath === 'decline') {
    return 'decline'
  }

  let step = draft.activeStep

  if (step === 'decline') {
    step = 'welcome'
  }

  if (step === 'welcome') {
    return 'welcome'
  }

  const hasGuestProgress =
    draft.guestSlots.length > 0 &&
    draft.guestSlots.some(
      (slot) =>
        slot.attending === false ||
        slot.firstName.trim().length > 0 ||
        Object.values(slot.fieldValues).some((v) => v.trim().length > 0),
    )

  if (!hasGuestProgress && GUEST_FLOW_STEP_INDEX[step] > GUEST_FLOW_STEP_INDEX.confirm) {
    return 'confirm'
  }

  if (!draft.checkout && GUEST_FLOW_STEP_INDEX[step] >= GUEST_FLOW_STEP_INDEX.mp_payment) {
    step = 'gift'
  }

  if (draft.checkout && draft.checkout.totalCents === 0 && step === 'mp_payment') {
    step = 'message'
  }

  if (step === 'mp_payment' && !draft.checkout) {
    step = 'gift'
  }

  return step
}

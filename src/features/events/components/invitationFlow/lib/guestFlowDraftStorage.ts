import { normalizeCheckoutSnapshot } from './guestCheckoutSession'
import type { GuestConfirmFormSlot } from './guestConfirmMock'
import {
  createDefaultCardPaymentPersisted,
  type GuestMpCardPaymentTypeId,
} from '../../blocks/mpPayment/guestMpPaymentDraft'
import {
  GUEST_FLOW_DRAFT_MAX_AGE_MS,
  GUEST_FLOW_DRAFT_VERSION,
  paymentTypeIdForGuestMethod,
  type GuestFlowDraft,
  type GuestPaymentMethodChoice,
  guestFlowDraftStorageKey,
} from './guestFlowDraft'
import { GUEST_FLOW_STEP_INDEX, type EventGuestFlowStep } from '../types'
import { migrateLegacyWizardStep } from './wizardStepStorage'

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
      slotId: initial.slotId ?? draft.slotId,
      firstName: initial.firstName,
      fieldValues,
      attending: draft.attending ?? initial.attending,
    }
  })
}

function normalizeLegacyPaymentMethod(
  paymentMethod: string | null | undefined,
): GuestPaymentMethodChoice | null {
  if (paymentMethod === 'card') return 'credit_card'
  if (
    paymentMethod === 'credit_card' ||
    paymentMethod === 'debit_card' ||
    paymentMethod === 'pix'
  ) {
    return paymentMethod
  }
  return null
}

function normalizeCardPaymentTypeId(
  paymentTypeId: string | undefined,
  paymentMethod: GuestPaymentMethodChoice | null,
): GuestMpCardPaymentTypeId {
  if (paymentTypeId === 'credit_card' || paymentTypeId === 'debit_card') {
    return paymentTypeId
  }
  return paymentTypeIdForGuestMethod(paymentMethod) ?? 'credit_card'
}

type GuestFlowDraftWithLegacyFields = GuestFlowDraft & { declineMessage?: string }

export function normalizeGuestFlowDraft(draft: GuestFlowDraft): GuestFlowDraft {
  const raw = draft as GuestFlowDraftWithLegacyFields
  const legacyDeclineMessage = raw.declineMessage?.trim() ?? ''
  const coupleMessage =
    raw.coupleMessage.trim().length > 0 ? raw.coupleMessage : legacyDeclineMessage

  const paymentMethod = normalizeLegacyPaymentMethod(
    draft.paymentMethod as string | null | undefined,
  )
  const defaultCard = createDefaultCardPaymentPersisted()
  const cardPayment = {
    ...defaultCard,
    ...draft.cardPayment,
    paymentTypeId: normalizeCardPaymentTypeId(
      (draft.cardPayment as { paymentTypeId?: string } | undefined)?.paymentTypeId,
      paymentMethod,
    ),
  }

  const checkout = draft.checkout
    ? normalizeCheckoutSnapshot(draft.checkout)
    : null

  const { declineMessage: _legacyDeclineMessage, ...rest } = raw

  return {
    ...rest,
    activeStep: migrateLegacyWizardStep(String(rest.activeStep)),
    coupleMessage,
    guestEmail: raw.guestEmail ?? '',
    messagePhase: raw.messagePhase === 'compose' ? 'compose' : 'email',
    giftCapturedEmail: raw.giftCapturedEmail ?? '',
    paymentMethod,
    cardPayment,
    checkout,
  }
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
    if (parsed.version !== GUEST_FLOW_DRAFT_VERSION && parsed.version !== 5 && parsed.version !== 4) return null
    if (parsed.invitationId !== invitationId || parsed.eventId !== eventId) return null

    const updatedAt = Date.parse(parsed.updatedAt)
    if (Number.isNaN(updatedAt) || Date.now() - updatedAt > GUEST_FLOW_DRAFT_MAX_AGE_MS) {
      clearGuestFlowDraft(invitationId)
      return null
    }

    return normalizeGuestFlowDraft(parsed)
  } catch {
    return null
  }
}

export function saveGuestFlowDraft(draft: GuestFlowDraft): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(guestFlowDraftStorageKey(draft.invitationId), JSON.stringify(draft))
  } catch {
    /* quota exceeded or private mode */
  }
}

export function clearGuestFlowDraft(invitationId: string): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.removeItem(guestFlowDraftStorageKey(invitationId))
  } catch {
    /* ignore */
  }
}

export function resolveGuestFlowStepFromDraft(draft: GuestFlowDraft): EventGuestFlowStep {
  let step = migrateLegacyWizardStep(String(draft.activeStep))

  if (draft.flowPath === 'decline' && step === 'welcome') {
    return 'guests'
  }

  if (step === 'welcome') {
    return 'welcome'
  }

  const hasGuestProgress =
    draft.guestSlots.length > 0 &&
    draft.guestSlots.some(
      (slot) =>
        slot.attending === false ||
        Object.values(slot.fieldValues).some((v) => v.trim().length > 0),
    )

  if (!hasGuestProgress && GUEST_FLOW_STEP_INDEX[step] > GUEST_FLOW_STEP_INDEX.guests) {
    return 'guests'
  }

  if (!draft.checkout && step === 'gifts' && draft.giftPhase === 'review') {
    return 'gifts'
  }

  return step
}

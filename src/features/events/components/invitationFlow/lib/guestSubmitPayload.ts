import type { GuestConfirmFormSlot } from './guestConfirmMock'

export type SubmitGuestSlotPayload = {
  id?: string
  first_name: string
  required_field_ids: string[]
  field_values: Record<string, string>
  attending: boolean
}

export type SubmitGuestSlotsPayload = {
  guests: SubmitGuestSlotPayload[]
}

export type SubmitGuestMessagePayload = {
  message: string
  email: string
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (v as Record<string, unknown>)[key]
          return acc
        }, {})
    }
    return v
  })
}

export function buildGuestSlotsSubmitPayload(
  guestSlots: GuestConfirmFormSlot[],
): SubmitGuestSlotsPayload {
  return {
    guests: guestSlots.map((slot) => {
      const row: SubmitGuestSlotPayload = {
        first_name: slot.firstName.trim(),
        required_field_ids: [...slot.requiredFieldIds],
        field_values: Object.fromEntries(
          Object.entries(slot.fieldValues).map(([k, v]) => [k, (v ?? '').trim()]),
        ),
        attending: slot.attending !== false,
      }
      if (slot.slotId) {
        row.id = slot.slotId
      }
      return row
    }),
  }
}

export function buildGuestMessageSubmitPayload(
  messageText: string,
  email: string,
): SubmitGuestMessagePayload {
  return {
    message: messageText.trim(),
    email: email.trim(),
  }
}

export function fingerprintGuestSlotsSubmitPayload(payload: SubmitGuestSlotsPayload): string {
  return stableStringify(payload)
}

export function fingerprintGuestMessagePayload(payload: SubmitGuestMessagePayload): string {
  return stableStringify({
    message: payload.message.trim(),
    email: payload.email.trim().toLowerCase(),
  })
}

export function guestSlotsSubmitUnchanged(
  payload: SubmitGuestSlotsPayload,
  lastSavedFingerprint: string | null | undefined,
): boolean {
  if (!lastSavedFingerprint) return false
  return fingerprintGuestSlotsSubmitPayload(payload) === lastSavedFingerprint
}

export function guestMessageSubmitUnchanged(
  payload: SubmitGuestMessagePayload,
  lastSavedFingerprint: string | null | undefined,
): boolean {
  if (!lastSavedFingerprint) return false
  return fingerprintGuestMessagePayload(payload) === lastSavedFingerprint
}

export function fingerprintGuestMessage(messageText: string): string {
  return messageText.trim()
}

export function guestMessageUnchanged(
  messageText: string,
  lastSavedMessage: string | null | undefined,
): boolean {
  if (lastSavedMessage === null || lastSavedMessage === undefined) return false
  return fingerprintGuestMessage(messageText) === lastSavedMessage
}

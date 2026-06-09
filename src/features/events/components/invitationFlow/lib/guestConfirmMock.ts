import { message } from 'antd'
import type { FieldDefinition, Invitation, InvitationGuestSlot, Product } from '@/shared/types/api'
import {
  fieldDefinitionById,
  getGuestFieldValidationErrorKey,
  guestFieldValidationMessageKey,
  resolveGuestFieldLabel,
  type GuestFieldValidationErrorKey,
} from './guestConfirmFieldUtils'
import {
  getMockGuestFieldDefinitions,
  getMockGuestTicket,
  getMockInvitation,
} from './guestInvitationMock'

export type GuestConfirmFormSlot = {
  slotId?: string
  firstName: string
  requiredFieldIds: string[]
  fieldValues: Record<string, string>
  fromInvitation: boolean
  hasPresetName: boolean
  attending: boolean
}

export function getMockGuestConfirmInvitation(eventId: string): Invitation {
  return getMockInvitation(eventId)
}

export function getMockGuestConfirmTicket(): Product {
  return getMockGuestTicket()
}

export function getMockGuestConfirmFieldDefinitions(): FieldDefinition[] {
  return getMockGuestFieldDefinitions()
}

export function ticketFieldIdsOrdered(ticket: Product): string[] {
  const refs = ticket.additional_info_fields ?? []
  return refs
    .filter((r) => r.active !== false)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((r) => r.field_id)
}

export function slotRequiredFieldIdsOrdered(
  slot: GuestConfirmFormSlot,
  ticket: Product,
): string[] {
  const ticketOrder = ticketFieldIdsOrdered(ticket)
  const requiredSet = new Set(slot.requiredFieldIds)
  const ordered = ticketOrder.filter((fieldId) => requiredSet.has(fieldId))
  if (ordered.length > 0) return ordered
  return [...slot.requiredFieldIds]
}

export function resolveGuestReviewDisplayName(slot: GuestConfirmFormSlot): string {
  return slot.firstName.trim()
}

export function resolveGuestReviewFieldIds(
  slot: GuestConfirmFormSlot,
  ticket: Product,
): string[] {
  return slotRequiredFieldIdsOrdered(slot, ticket)
}

export function resolveGuestRequiredFieldIds(
  inv: InvitationGuestSlot | undefined,
): string[] {
  return [...(inv?.required_field_ids ?? [])]
}

export function fieldLabelById(
  fieldId: string,
  defs: FieldDefinition[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  return resolveGuestFieldLabel(fieldDefinitionById(fieldId, defs), fieldId, t)
}

export function buildInitialGuestConfirmSlots(
  invitation: Invitation,
): GuestConfirmFormSlot[] {
  const existingSlots = invitation.guest_slots ?? []
  const count = Math.max(
    1,
    invitation.guest_slot_count ?? 0,
    existingSlots.length,
  )

  return Array.from({ length: count }, (_, index) => {
    const inv = existingSlots[index]
    const firstName = (inv?.first_name ?? '').trim()
    const requiredFieldIds = resolveGuestRequiredFieldIds(inv)

    const fieldValues = { ...(inv?.field_values ?? {}) }
    const attending = inv?.attending !== undefined ? inv.attending : true

    return {
      slotId: inv?.id,
      firstName,
      requiredFieldIds,
      fieldValues,
      fromInvitation: Boolean(inv?.required_field_ids?.length),
      hasPresetName: Boolean(firstName),
      attending,
    }
  })
}

export type GuestSlotValidationResult = {
  valid: boolean
  missingFieldIds: string[]
  invalidFieldIds: string[]
  firstInvalidFieldErrorKey?: GuestFieldValidationErrorKey | null
}

export function showGuestConfirmValidationMessage(
  t: (key: string, options?: Record<string, unknown>) => string,
  result: GuestSlotValidationResult,
  fieldDefinitions: FieldDefinition[],
): void {
  if (result.missingFieldIds.length > 0) {
    const labels = result.missingFieldIds
      .map((id) => fieldLabelById(id, fieldDefinitions, t))
      .join(', ')
    message.error(t('events.detail.guestConfirm.validationFieldsRequired', { fields: labels }))
    return
  }
  if (result.invalidFieldIds.length > 0) {
    const firstInvalidId = result.invalidFieldIds[0]
    const label = fieldLabelById(firstInvalidId, fieldDefinitions, t)
    const errorKey = result.firstInvalidFieldErrorKey ?? 'required'
    message.error(t(guestFieldValidationMessageKey(errorKey), { label }))
  }
}

export function findFirstInvalidGuestSlotIndex(
  slots: GuestConfirmFormSlot[],
  fieldDefinitions: FieldDefinition[],
): { index: number; result: GuestSlotValidationResult } | null {
  for (let index = 0; index < slots.length; index += 1) {
    const result = validateGuestSlot(slots[index], fieldDefinitions)
    if (!result.valid) {
      return { index, result }
    }
  }
  return null
}

export function allGuestsNotAttending(slots: GuestConfirmFormSlot[]): boolean {
  return slots.length > 0 && slots.every((slot) => slot.attending === false)
}

export function markAllGuestsNotAttending(
  slots: GuestConfirmFormSlot[],
): GuestConfirmFormSlot[] {
  return slots.map((slot) => ({ ...slot, attending: false }))
}

export function validateGuestSlot(
  slot: GuestConfirmFormSlot,
  fieldDefinitions: FieldDefinition[],
): GuestSlotValidationResult {
  if (slot.attending === false) {
    return {
      valid: true,
      missingFieldIds: [],
      invalidFieldIds: [],
      firstInvalidFieldErrorKey: null,
    }
  }
  const missingFieldIds: string[] = []
  const invalidFieldIds: string[] = []
  let firstInvalidFieldErrorKey: GuestFieldValidationErrorKey | null = null

  for (const fieldId of slot.requiredFieldIds) {
    const value = slot.fieldValues[fieldId]?.trim() ?? ''
    if (!value) {
      missingFieldIds.push(fieldId)
      continue
    }
    const definition = fieldDefinitionById(fieldId, fieldDefinitions)
    if (!definition) continue
    const errorKey = getGuestFieldValidationErrorKey(definition, value)
    if (errorKey !== null) {
      invalidFieldIds.push(fieldId)
      if (firstInvalidFieldErrorKey === null) {
        firstInvalidFieldErrorKey = errorKey
      }
    }
  }

  return {
    valid: missingFieldIds.length === 0 && invalidFieldIds.length === 0,
    missingFieldIds,
    invalidFieldIds,
    firstInvalidFieldErrorKey,
  }
}

export function formatReviewGuestHeading(
  slot: GuestConfirmFormSlot,
  guestIndex: number,
  t: (key: string, options?: Record<string, unknown>) => string,
  displayName?: string,
): string {
  const notAttending = slot.attending === false
  const name = (displayName ?? slot.firstName).trim()
  const notAttendingSuffix = t('events.detail.guestConfirm.reviewNotAttending')

  if (slot.hasPresetName && name) {
    const base = t('events.detail.guestConfirm.presetInvitation', { name })
    return notAttending ? `${base} — ${notAttendingSuffix}` : base
  }

  const heading = t('events.detail.guestConfirm.reviewGuestHeading', { index: guestIndex })

  if (notAttending) {
    return name ? `${heading}: ${name} — ${notAttendingSuffix}` : `${heading} — ${notAttendingSuffix}`
  }

  if (name) {
    return `${heading}: ${name}`
  }

  return heading
}

export function formatReviewFieldLine(
  fieldId: string,
  slot: GuestConfirmFormSlot,
  fieldDefinitions: FieldDefinition[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const label = fieldLabelById(fieldId, fieldDefinitions, t)
  const value = slot.fieldValues[fieldId]?.trim()
  const displayValue = value || t('events.detail.guestConfirm.reviewNotProvided')
  return `${label}: ${displayValue}`
}

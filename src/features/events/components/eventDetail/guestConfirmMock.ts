import type { FieldDefinition, Invitation, InvitationGuestSlot, Product } from '@/shared/types/api'
import {
  getMockGuestFieldDefinitions,
  getMockGuestTicket,
  getMockInvitation,
} from './guestInvitationMock'

export type GuestConfirmFormSlot = {
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
  return refs.filter((r) => r.active !== false).map((r) => r.field_id)
}

export function resolveGuestRequiredFieldIds(
  inv: InvitationGuestSlot | undefined,
  ticket: Product,
): string[] {
  if (inv?.required_field_ids?.length) {
    return [...inv.required_field_ids]
  }
  return ticketFieldIdsOrdered(ticket)
}

export function fieldLabelById(fieldId: string, defs: FieldDefinition[]): string {
  return defs.find((d) => d.id === fieldId)?.label ?? fieldId
}

export function buildInitialGuestConfirmSlots(
  invitation: Invitation,
  ticket: Product,
): GuestConfirmFormSlot[] {
  const count = Math.max(1, invitation.guest_slot_count ?? invitation.guest_slots?.length ?? 1)

  return Array.from({ length: count }, (_, index) => {
    const inv = invitation.guest_slots?.[index]
    const firstName = (inv?.first_name ?? '').trim()
    const requiredFieldIds = resolveGuestRequiredFieldIds(inv, ticket)

    return {
      firstName,
      requiredFieldIds,
      fieldValues: {},
      fromInvitation: Boolean(inv?.required_field_ids?.length),
      hasPresetName: Boolean(firstName),
      attending: true,
    }
  })
}

export type GuestSlotValidationResult = {
  valid: boolean
  missingName: boolean
  missingFieldIds: string[]
}

export function validateGuestSlot(slot: GuestConfirmFormSlot): GuestSlotValidationResult {
  if (slot.attending === false) {
    return { valid: true, missingName: false, missingFieldIds: [] }
  }
  const missingName = !slot.hasPresetName && !slot.firstName.trim()
  const missingFieldIds = slot.requiredFieldIds.filter((id) => !slot.fieldValues[id]?.trim())
  return {
    valid: !missingName && missingFieldIds.length === 0,
    missingName,
    missingFieldIds,
  }
}

export function formatReviewGuestHeading(
  slot: GuestConfirmFormSlot,
  guestIndex: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const notAttending = slot.attending === false
  const name = slot.firstName.trim()
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

  return `${heading} — ${t('events.detail.guestConfirm.reviewNameMissing')}`
}

export function formatReviewFieldLine(
  fieldId: string,
  slot: GuestConfirmFormSlot,
  fieldDefinitions: FieldDefinition[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const label = fieldLabelById(fieldId, fieldDefinitions)
  const value = slot.fieldValues[fieldId]?.trim()
  const displayValue = value || t('events.detail.guestConfirm.reviewNotProvided')
  return `${label}: ${displayValue}`
}

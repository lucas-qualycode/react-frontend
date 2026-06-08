import type { Invitation, InvitationGuestSlot } from '@/shared/types/api'
import type { InvitationGuestSlotView } from './guestInvitationApi'

export function mergeInvitationGuestSlots(
  invitation: Invitation,
  guestSlots?: InvitationGuestSlotView[] | InvitationGuestSlot[],
): Invitation {
  if (!guestSlots?.length) {
    return invitation
  }

  return {
    ...invitation,
    guest_slots: guestSlots.map((slot) => {
      const { user_product: _userProduct, ...rest } = slot as InvitationGuestSlotView
      return rest as InvitationGuestSlot
    }),
  }
}

export function invitationHasExistingGuestSlots(invitation: Invitation): boolean {
  return (invitation.guest_slots ?? []).some((slot) => Boolean(slot.id))
}

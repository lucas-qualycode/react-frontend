import type { Invitation, Spot } from '@/shared/types/api'
import type { InvitationSpotView } from './guestInvitationApi'

export function mergeInvitationSpots(
  invitation: Invitation,
  spots?: InvitationSpotView[] | Spot[],
): Invitation {
  if (!spots?.length) {
    return invitation
  }

  return {
    ...invitation,
    spots: spots.map((spot) => {
      const { user_product: _userProduct, ...rest } = spot as InvitationSpotView
      return rest as Spot
    }),
  }
}

export function invitationHasExistingSpots(invitation: Invitation): boolean {
  return (invitation.spots ?? []).some((spot) => Boolean(spot.id))
}

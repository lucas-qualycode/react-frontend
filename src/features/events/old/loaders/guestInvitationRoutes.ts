import type { InvitationAccess } from '@/shared/api/invitationAccess'
import { appendInvitationAccessQuery } from '@/shared/api/invitationAccess'
import type { Event, Invitation } from '@/shared/types/api'
import type {
  InvitationGuestView,
  GuestPaymentStatusResponse,
  InvitationPaymentSummary,
} from '../components/invitationFlow/lib/guestInvitationApi'

export type GuestInvitationLoaderData = {
  eventId: string
  invitationId: string
  invitationAccess: InvitationAccess
  event: Event
  invitation: Invitation
  guestView: InvitationGuestView
  payments: InvitationPaymentSummary[]
  pendingGiftPayment: GuestPaymentStatusResponse | null
}

export function guestInvitationPath(
  eventId: string,
  invitationId: string,
  access?: InvitationAccess | null,
): string {
  return appendInvitationAccessQuery(
    `/events/${eventId}/invitation/${invitationId}`,
    access,
  )
}

export function guestInvitationBasePath(eventId: string, invitationId: string): string {
  return `/events/${eventId}/invitation/${invitationId}`
}

export function isLegacyGuestInvitationPath(pathname: string): boolean {
  return pathname.endsWith('/payment') || pathname.endsWith('/confirmed')
}

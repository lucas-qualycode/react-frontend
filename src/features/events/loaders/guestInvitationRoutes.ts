import type { InvitationAccess } from '@/shared/api/invitationAccess'
import { appendInvitationAccessQuery } from '@/shared/api/invitationAccess'
import type { ActiveCheckoutResponse } from '../components/blocks/payment/checkoutPayload'
import type { Event, Invitation } from '@/shared/types/api'

export type GuestInvitationPhase = 'wizard' | 'payment' | 'confirmed'

export type GuestInvitationLoaderData = {
  eventId: string
  invitationId: string
  invitationAccess: InvitationAccess
  event: Event
  invitation: Invitation
  activeCheckout: ActiveCheckoutResponse | null
  phase: GuestInvitationPhase
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

/** @deprecated Use guestInvitationPath; payment is a phase, not a route. */
export function guestPaymentPath(
  eventId: string,
  invitationId: string,
  access?: InvitationAccess | null,
): string {
  return guestInvitationPath(eventId, invitationId, access)
}

/** @deprecated Use guestInvitationPath; confirmed is a phase, not a route. */
export function guestConfirmedPath(
  eventId: string,
  invitationId: string,
  access?: InvitationAccess | null,
): string {
  return guestInvitationPath(eventId, invitationId, access)
}

export function isLegacyGuestInvitationPath(pathname: string): boolean {
  return pathname.endsWith('/payment') || pathname.endsWith('/confirmed')
}

const PENDING_STATUSES = new Set(['PENDING', 'PROCESSING'])
const TERMINAL_FAILED_STATUSES = new Set(['FAILED', 'CANCELLED'])

function isTerminalFailedCheckout(activeCheckout: ActiveCheckoutResponse): boolean {
  const status = activeCheckout.payment_status?.toUpperCase() ?? ''
  if (TERMINAL_FAILED_STATUSES.has(status)) return true
  return activeCheckout.next_action === 'failed'
}

function hasRetryableFailedPayment(activeCheckout: ActiveCheckoutResponse): boolean {
  return Boolean(activeCheckout.payment_id) && isTerminalFailedCheckout(activeCheckout)
}

export function resolveGuestInvitationPhase(
  activeCheckout: ActiveCheckoutResponse | null,
): GuestInvitationPhase {
  if (!activeCheckout) return 'wizard'

  const status = activeCheckout.payment_status?.toUpperCase() ?? ''
  const isPending =
    activeCheckout.active ||
    (Boolean(activeCheckout.payment_id) && PENDING_STATUSES.has(status))
  const isApproved =
    status === 'APPROVED' ||
    (activeCheckout.has_approved_payment && !isPending)

  if (isApproved) return 'confirmed'
  if (isPending || hasRetryableFailedPayment(activeCheckout)) return 'payment'
  return 'wizard'
}

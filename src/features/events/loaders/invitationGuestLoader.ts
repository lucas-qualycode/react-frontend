import type { QueryClient } from '@tanstack/react-query'
import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { getEvent, getInvitation } from '@/features/events/api'
import { fetchActiveCheckout } from '@/features/events/components/blocks/payment/checkoutPayload'
import {
  isInvitationAccessFailure,
  type InvitationAccess,
  type InvitationAccessFailureCode,
} from '@/shared/api/invitationAccess'
import type { Event, Invitation } from '@/shared/types/api'
import {
  guestInvitationPath,
  isLegacyGuestInvitationPath,
  resolveGuestInvitationPhase,
  type GuestInvitationLoaderData,
} from './guestInvitationRoutes'

export type { GuestInvitationLoaderData } from './guestInvitationRoutes'

type UnavailableReason = InvitationAccessFailureCode | 'required' | 'generic'

function unavailablePath(
  eventId: string,
  invitationId: string,
  reason: UnavailableReason,
): string {
  return `/events/${eventId}/invitation/${invitationId}/unavailable?reason=${encodeURIComponent(reason)}`
}

function redirectUnavailable(
  eventId: string,
  invitationId: string,
  reason: UnavailableReason,
): never {
  throw redirect(unavailablePath(eventId, invitationId, reason))
}

function resolveAccessFailureReason(errors: unknown[]): UnavailableReason {
  if (errors.some((e) => isInvitationAccessFailure(e) && e.code === 'invitation_expired')) {
    return 'invitation_expired'
  }
  if (
    errors.some(
      (e) => isInvitationAccessFailure(e) && e.code === 'invitation_access_token_invalid',
    )
  ) {
    return 'invitation_access_token_invalid'
  }
  return 'generic'
}

export function createGuestInvitationLoader(queryClient: QueryClient) {
  return async ({
    params,
    request,
  }: LoaderFunctionArgs): Promise<GuestInvitationLoaderData> => {
    const eventId = params.id?.trim() ?? ''
    const invitationId = params.invitationId?.trim() ?? ''
    if (!eventId || !invitationId) {
      throw redirect('/')
    }

    const requestUrl = new URL(request.url)
    if (isLegacyGuestInvitationPath(requestUrl.pathname)) {
      throw redirect(guestInvitationPath(eventId, invitationId) + requestUrl.search)
    }

    const token = requestUrl.searchParams.get('token')?.trim() ?? ''
    if (!token) {
      redirectUnavailable(eventId, invitationId, 'required')
    }

    const invitationAccess: InvitationAccess = { invitationId, token }

    const [eventResult, invitationResult, activeResult] = await Promise.allSettled([
      getEvent(eventId, invitationAccess),
      getInvitation(invitationId, invitationAccess),
      fetchActiveCheckout(invitationId, invitationAccess),
    ])

    const rejections: unknown[] = []
    if (eventResult.status === 'rejected') {
      rejections.push(eventResult.reason)
    }
    if (invitationResult.status === 'rejected') {
      rejections.push(invitationResult.reason)
    }

    if (rejections.length > 0) {
      redirectUnavailable(eventId, invitationId, resolveAccessFailureReason(rejections))
    }

    const event = (eventResult as PromiseFulfilledResult<Event>).value
    const invitation = (invitationResult as PromiseFulfilledResult<Invitation>).value

    let activeCheckout = null
    if (activeResult.status === 'fulfilled') {
      activeCheckout = activeResult.value
    }

    queryClient.setQueryData(['event', eventId, token], event)
    queryClient.setQueryData(['invitation', invitationId, token], invitation)
    if (activeCheckout) {
      queryClient.setQueryData(['activeCheckout', invitationId, token], activeCheckout)
    }

    const phase = resolveGuestInvitationPhase(activeCheckout)

    return {
      eventId,
      invitationId,
      invitationAccess,
      event,
      invitation,
      activeCheckout,
      phase,
    }
  }
}

export const createInvitationGuestLoader = createGuestInvitationLoader

import type { QueryClient } from '@tanstack/react-query'
import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { getEvent, getInvitation } from '@/features/events/api'
import {
  isInvitationAccessFailure,
  type InvitationAccess,
  type InvitationAccessFailureCode,
} from '@/shared/api/invitationAccess'
import type { Event, Invitation } from '@/shared/types/api'

export type InvitationGuestLoaderData = {
  eventId: string
  invitationId: string
  invitationAccess: InvitationAccess
  event: Event
}

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

export function createInvitationGuestLoader(queryClient: QueryClient) {
  return async ({
    params,
    request,
  }: LoaderFunctionArgs): Promise<InvitationGuestLoaderData> => {
    const eventId = params.id?.trim() ?? ''
    const invitationId = params.invitationId?.trim() ?? ''
    if (!eventId || !invitationId) {
      throw redirect('/')
    }

    const token = new URL(request.url).searchParams.get('token')?.trim() ?? ''
    if (!token) {
      redirectUnavailable(eventId, invitationId, 'required')
    }

    const invitationAccess: InvitationAccess = { invitationId, token }

    const [eventResult, invitationResult] = await Promise.allSettled([
      getEvent(eventId, invitationAccess),
      getInvitation(invitationId, invitationAccess),
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

    queryClient.setQueryData(['event', eventId, token], event)
    queryClient.setQueryData(['invitation', invitationId, token], invitation)

    return {
      eventId,
      invitationId,
      invitationAccess,
      event,
    }
  }
}

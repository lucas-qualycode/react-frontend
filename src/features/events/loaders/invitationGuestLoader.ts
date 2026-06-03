import type { QueryClient } from '@tanstack/react-query'
import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { getEvent } from '@/features/events/api'
import {
  fetchInvitationGuestView,
  fetchInvitationPayments,
  resolvePendingGiftPaymentFromList,
} from '@/features/events/components/invitationFlow/lib/guestInvitationApi'
import { invitationPaymentsQueryKey } from '@/features/events/components/invitationFlow/hooks/useInvitationPayments'
import {
  isInvitationAccessFailure,
  type InvitationAccess,
  type InvitationAccessFailureCode,
} from '@/shared/api/invitationAccess'
import type { Event } from '@/shared/types/api'
import {
  guestInvitationPath,
  isLegacyGuestInvitationPath,
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

    const [eventResult, guestViewResult, paymentsResult] = await Promise.allSettled([
      getEvent(eventId, invitationAccess),
      fetchInvitationGuestView(invitationId, invitationAccess),
      fetchInvitationPayments(invitationId, invitationAccess),
    ])

    const rejections: unknown[] = []
    if (eventResult.status === 'rejected') {
      rejections.push(eventResult.reason)
    }
    if (guestViewResult.status === 'rejected') {
      rejections.push(guestViewResult.reason)
    }

    if (rejections.length > 0) {
      redirectUnavailable(eventId, invitationId, resolveAccessFailureReason(rejections))
    }

    const event = (eventResult as PromiseFulfilledResult<Event>).value
    const guestView = (guestViewResult as PromiseFulfilledResult<Awaited<ReturnType<typeof fetchInvitationGuestView>>>).value
    const payments =
      paymentsResult.status === 'fulfilled' ? paymentsResult.value.payments : []
    const resumePendingGift = guestView.invitation.wizard_step === 'gifts'
    const pendingGiftPayment = await resolvePendingGiftPaymentFromList(
      payments,
      invitationId,
      invitationAccess,
      { fetchStatus: resumePendingGift },
    )

    queryClient.setQueryData(['event', eventId, token], event)
    queryClient.setQueryData(['invitationGuestView', invitationId, token], guestView)
    queryClient.setQueryData(['invitation', invitationId, token], guestView.invitation)
    queryClient.setQueryData(invitationPaymentsQueryKey(invitationId, token), payments)

    return {
      eventId,
      invitationId,
      invitationAccess,
      event,
      invitation: guestView.invitation,
      guestView,
      payments,
      pendingGiftPayment,
    }
  }
}

export const createInvitationGuestLoader = createGuestInvitationLoader

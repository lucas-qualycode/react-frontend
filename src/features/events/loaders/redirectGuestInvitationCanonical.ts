import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { guestInvitationBasePath } from './guestInvitationRoutes'

export function redirectGuestInvitationCanonical({ params, request }: LoaderFunctionArgs): never {
  const eventId = params.id?.trim() ?? ''
  const invitationId = params.invitationId?.trim() ?? ''
  if (!eventId || !invitationId) {
    throw redirect('/')
  }

  const url = new URL(request.url)
  const canonical = guestInvitationBasePath(eventId, invitationId)
  throw redirect(`${canonical}${url.search}`)
}

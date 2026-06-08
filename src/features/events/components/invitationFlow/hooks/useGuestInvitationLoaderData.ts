import { useLoaderData } from 'react-router-dom'
import type { GuestInvitationLoaderData } from '@/features/events/loaders/guestInvitationRoutes'

export function useGuestInvitationLoaderData(): GuestInvitationLoaderData | undefined {
  return useLoaderData() as GuestInvitationLoaderData | undefined
}

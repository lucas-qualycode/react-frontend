import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLoaderData } from 'react-router-dom'
import type { GuestInvitationLoaderData } from '@/features/events/loaders/guestInvitationRoutes'
import {
  fetchInvitationPayments,
  type InvitationPaymentSummary,
} from '../lib/guestInvitationApi'

export function invitationPaymentsQueryKey(invitationId: string, token: string) {
  return ['invitationPayments', invitationId, token] as const
}

export function useInvitationPayments() {
  const { invitationId, invitationAccess, payments } = useLoaderData() as GuestInvitationLoaderData

  return useQuery({
    queryKey: invitationPaymentsQueryKey(invitationId, invitationAccess.token),
    queryFn: async (): Promise<InvitationPaymentSummary[]> => {
      const result = await fetchInvitationPayments(invitationId, invitationAccess)
      return result.payments
    },
    initialData: payments,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}

export function useInvalidateInvitationPayments() {
  const queryClient = useQueryClient()
  const { invitationId, invitationAccess } = useLoaderData() as GuestInvitationLoaderData

  return () =>
    queryClient.invalidateQueries({
      queryKey: invitationPaymentsQueryKey(invitationId, invitationAccess.token),
    })
}

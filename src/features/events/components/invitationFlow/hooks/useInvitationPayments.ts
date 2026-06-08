import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useGuestInvitationLoaderData } from './useGuestInvitationLoaderData'
import {
  fetchInvitationPayments,
  type InvitationPaymentSummary,
} from '../lib/guestInvitationApi'

export function invitationPaymentsQueryKey(invitationId: string, token: string) {
  return ['invitationPayments', invitationId, token] as const
}

export function useInvitationPayments() {
  const loaderData = useGuestInvitationLoaderData()
  if (!loaderData) {
    throw new Error('useInvitationPayments requires guest invitation loader data')
  }
  const { invitationId, invitationAccess, payments } = loaderData

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
  const loaderData = useGuestInvitationLoaderData()

  return () => {
    if (!loaderData) return
    queryClient.invalidateQueries({
      queryKey: invitationPaymentsQueryKey(loaderData.invitationId, loaderData.invitationAccess.token),
    })
  }
}

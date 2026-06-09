import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { FieldDefinition, Invitation, Product } from '@/shared/types/api'
import {
  useFieldDefinitions,
  useInvitationTicketProducts,
} from '@/features/events/hooks'
import {
  USE_MOCK_INVITATION,
  getMockGuestFieldDefinitions,
  getMockGuestTicket,
  getMockInvitationGuestView,
} from '../lib/guestInvitationMock'
import { isInvitationAccessFailure } from '@/shared/api/invitationAccess'
import { useInvitationAccess } from '@/shared/api/InvitationAccessContext'
import {
  fetchInvitationGuestView,
  type InvitationGuestView,
} from '../lib/guestInvitationApi'
import { mergeInvitationSpots } from '../lib/invitationSpots'

export function useGuestInvitation(
  eventId: string | undefined,
  invitationId: string | undefined,
) {
  const invitationAccess = useInvitationAccess()
  const guestViewQuery = useQuery({
    queryKey: ['invitationGuestView', invitationId, invitationAccess?.token ?? ''],
    queryFn: async (): Promise<InvitationGuestView> => {
      if (USE_MOCK_INVITATION) return getMockInvitationGuestView(eventId ?? 'evt-1')
      return fetchInvitationGuestView(eventId!, invitationId!, invitationAccess)
    },
    enabled: !USE_MOCK_INVITATION && !!eventId && !!invitationId,
    staleTime: 30_000,
  })

  const fieldDefinitionsQuery = useFieldDefinitions(!USE_MOCK_INVITATION)
  const ticketProductsQuery = useInvitationTicketProducts(
    USE_MOCK_INVITATION ? undefined : eventId,
    USE_MOCK_INVITATION ? undefined : invitationId,
  )

  const guestView = useMemo((): InvitationGuestView | null => {
    if (USE_MOCK_INVITATION) {
      return eventId ? getMockInvitationGuestView(eventId) : null
    }
    return guestViewQuery.data ?? null
  }, [eventId, guestViewQuery.data])

  const invitation = useMemo((): Invitation | null => {
    if (!guestView) return null
    return mergeInvitationSpots(guestView.invitation, guestView.spots)
  }, [guestView])

  const fieldDefinitions = useMemo((): FieldDefinition[] => {
    if (USE_MOCK_INVITATION) return getMockGuestFieldDefinitions()
    return fieldDefinitionsQuery.data ?? []
  }, [fieldDefinitionsQuery.data])

  const ticket = useMemo((): Product | null => {
    if (USE_MOCK_INVITATION) return getMockGuestTicket()
    if (!invitation?.ticket_id) return null
    return ticketProductsQuery.data?.find((p) => p.id === invitation.ticket_id) ?? null
  }, [invitation, ticketProductsQuery.data])

  const missingInvitationId = !USE_MOCK_INVITATION && !invitationId

  const invitationLoadError = guestViewQuery.error
  const invitationLoadFailureCode = isInvitationAccessFailure(invitationLoadError)
    ? invitationLoadError.code
    : null

  const isLoading =
    !USE_MOCK_INVITATION &&
    (guestViewQuery.isLoading ||
      fieldDefinitionsQuery.isLoading ||
      (!!invitationId && ticketProductsQuery.isLoading))

  const isError =
    missingInvitationId ||
    (!USE_MOCK_INVITATION &&
      (guestViewQuery.isError ||
        fieldDefinitionsQuery.isError ||
        ticketProductsQuery.isError ||
        (!guestViewQuery.isLoading && !!invitationId && !guestView)))

  return {
    invitation,
    guestView,
    ticket,
    fieldDefinitions,
    isLoading,
    isError,
    missingInvitationId,
    invitationLoadFailureCode,
    isMocked: USE_MOCK_INVITATION,
    refetchGuestView: guestViewQuery.refetch,
  }
}

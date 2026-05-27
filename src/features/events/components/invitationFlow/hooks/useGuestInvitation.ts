import { useMemo } from 'react'
import type { FieldDefinition, Invitation, Product } from '@/shared/types/api'
import {
  useFieldDefinitions,
  useInvitation,
  useInvitationTicketProducts,
} from '@/features/events/hooks'
import {
  USE_MOCK_INVITATION,
  getMockGuestFieldDefinitions,
  getMockGuestTicket,
  getMockInvitation,
} from '../lib/guestInvitationMock'
import { isInvitationAccessFailure } from '@/shared/api/invitationAccess'

export function useGuestInvitation(
  eventId: string | undefined,
  invitationId: string | undefined,
) {
  const invitationQuery = useInvitation(USE_MOCK_INVITATION ? undefined : invitationId)
  const fieldDefinitionsQuery = useFieldDefinitions(!USE_MOCK_INVITATION)
  const ticketProductsQuery = useInvitationTicketProducts(
    USE_MOCK_INVITATION ? undefined : invitationId,
  )

  const invitation = useMemo((): Invitation | null => {
    if (USE_MOCK_INVITATION) {
      return eventId ? getMockInvitation(eventId) : null
    }
    return invitationQuery.data ?? null
  }, [eventId, invitationQuery.data])

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

  const invitationLoadError = invitationQuery.error
  const invitationLoadFailureCode = isInvitationAccessFailure(invitationLoadError)
    ? invitationLoadError.code
    : null

  const isLoading =
    !USE_MOCK_INVITATION &&
    (invitationQuery.isLoading ||
      fieldDefinitionsQuery.isLoading ||
      (!!invitationId && ticketProductsQuery.isLoading))

  const isError =
    missingInvitationId ||
    (!USE_MOCK_INVITATION &&
      (invitationQuery.isError ||
        fieldDefinitionsQuery.isError ||
        ticketProductsQuery.isError ||
        (!invitationQuery.isLoading && !!invitationId && !invitation)))

  return {
    invitation,
    ticket,
    fieldDefinitions,
    isLoading,
    isError,
    missingInvitationId,
    invitationLoadFailureCode,
    isMocked: USE_MOCK_INVITATION,
  }
}

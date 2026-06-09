import { useMemo } from 'react'
import { useInvitationGiftProducts } from '@/features/events/hooks'

export function useGuestGiftProducts(
  eventId: string | undefined,
  invitationId: string | undefined,
) {
  const { data: apiProducts = [], isLoading } = useInvitationGiftProducts(eventId, invitationId)
  const products = useMemo(
    () => apiProducts.filter((p) => p.active !== false),
    [apiProducts],
  )
  return { products, isLoading }
}

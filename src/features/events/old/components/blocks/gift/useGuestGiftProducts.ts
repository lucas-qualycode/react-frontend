import { useMemo } from 'react'
import { useInvitationGiftProducts } from '@/features/events/hooks'

export function useGuestGiftProducts(invitationId: string | undefined) {
  const { data: apiProducts = [], isLoading } = useInvitationGiftProducts(invitationId)
  const products = useMemo(
    () => apiProducts.filter((p) => p.active !== false),
    [apiProducts],
  )
  return { products, isLoading }
}

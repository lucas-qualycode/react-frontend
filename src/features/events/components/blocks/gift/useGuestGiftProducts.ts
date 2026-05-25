import { useMemo } from 'react'
import { useEventGiftProducts } from '@/features/events/hooks'
import { USE_MOCK_GIFT_PRODUCTS, getMockGiftProducts } from './guestGiftMock'

export function useGuestGiftProducts(eventId: string | undefined) {
  const { data: apiProducts = [], isLoading } = useEventGiftProducts(
    USE_MOCK_GIFT_PRODUCTS ? undefined : eventId,
  )
  const products = useMemo(() => {
    if (USE_MOCK_GIFT_PRODUCTS) return getMockGiftProducts()
    const active = apiProducts.filter((p) => p.active !== false)
    if (active.length > 0) return active
    return getMockGiftProducts()
  }, [apiProducts])
  return {
    products,
    isLoading: USE_MOCK_GIFT_PRODUCTS ? false : isLoading && apiProducts.length === 0,
  }
}

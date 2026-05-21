import type { Product } from '@/shared/types/api'

export type GuestCheckoutLineItem = {
  productId: string
  name: string
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
}

export type GuestCheckoutSnapshot = {
  eventId: string
  lineItems: GuestCheckoutLineItem[]
  totalCents: number
  currency: 'BRL'
}

export function buildCheckoutSnapshotFromProducts(
  eventId: string,
  products: Product[],
): GuestCheckoutSnapshot {
  const lineItems = products.map((product) => ({
    productId: product.id,
    name: product.name,
    quantity: 1,
    unitPriceCents: product.is_free ? 0 : product.value,
    totalPriceCents: product.is_free ? 0 : product.value,
  }))
  const totalCents = lineItems.reduce((sum, item) => sum + item.totalPriceCents, 0)
  return {
    eventId,
    lineItems,
    totalCents,
    currency: 'BRL',
  }
}

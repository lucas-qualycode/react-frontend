import { describe, expect, it } from 'vitest'
import { giftOnlyCheckoutSnapshot, type GuestCheckoutSnapshot } from './guestCheckoutSession'

function checkoutWithItems(
  items: GuestCheckoutSnapshot['items'],
): GuestCheckoutSnapshot {
  return {
    parent_id: 'event-1',
    items,
    total_cents: items.reduce((sum, item) => sum + item.total_price, 0),
    currency: 'BRL',
  }
}

describe('giftOnlyCheckoutSnapshot', () => {
  it('removes ticket line items and recalculates total_cents', () => {
    const checkout = checkoutWithItems([
      {
        product_id: 'ticket-1',
        product_type: 'TICKET',
        name: 'VIP',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      },
      {
        product_id: 'gift-1',
        product_type: 'GIFT',
        name: 'Honeymoon',
        quantity: 1,
        unit_price: 1200,
        total_price: 1200,
      },
    ])

    const result = giftOnlyCheckoutSnapshot(checkout)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.product_type).toBe('GIFT')
    expect(result.total_cents).toBe(1200)
  })
})

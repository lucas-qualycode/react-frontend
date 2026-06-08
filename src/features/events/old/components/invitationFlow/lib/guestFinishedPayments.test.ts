import { describe, expect, it } from 'vitest'
import { buildGuestFinishedPaymentLineItems } from './guestFinishedPayments'
import type { InvitationPaymentOrderItem } from './guestInvitationApi'

const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === 'events.detail.guestFinished.paymentItemGuest') {
    return `Guest: ${String(options?.name ?? '')}`
  }
  if (key === 'events.detail.guestFinished.paymentItemQuantity') {
    return `Qty ${String(options?.count ?? '')}`
  }
  return key
}) as Parameters<typeof buildGuestFinishedPaymentLineItems>[1]['t']

describe('guestFinishedPayments', () => {
  it('builds line items from order items with guest and quantity details', () => {
    const items: InvitationPaymentOrderItem[] = [
      {
        id: 'item-1',
        product_id: 'gift-1',
        product_type: 'GIFT',
        name: 'Coffee set',
        quantity: 2,
        unit_price: 2500,
        total_price: 5000,
      },
      {
        id: 'item-2',
        product_id: 'ticket-1',
        product_type: 'TICKET',
        name: 'Guest ticket',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        guest_slot_id: 'slot-1',
      },
    ]

    const lineItems = buildGuestFinishedPaymentLineItems(items, {
      slotById: new Map([
        [
          'slot-1',
          {
            id: 'slot-1',
            invitation_id: 'inv-1',
            first_name: 'Ana',
            required_field_ids: [],
            field_values: {},
            attending: true,
            status: 'ACTIVE',
            created_at: '',
            updated_at: '',
            user_product: null,
          },
        ],
      ]),
      currency: 'BRL',
      t,
    })

    expect(lineItems).toHaveLength(2)
    expect(lineItems[0]?.title).toBe('Coffee set')
    expect(lineItems[0]?.subtitle).toContain('Qty 2')
    expect(lineItems[1]?.subtitle).toContain('Guest: Ana')
    expect(lineItems[1]?.kind).toBe('ticket')
    expect(lineItems[1]?.subtitle).toContain('events.detail.guestGift.free')
  })
})

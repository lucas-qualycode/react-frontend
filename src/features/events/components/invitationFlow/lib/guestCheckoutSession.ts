import type { Product, ProductKind } from '@/shared/types/api'
import type { GuestConfirmFormSlot } from './guestConfirmMock'

export type GuestCheckoutLineItem = {
  product_id: string
  product_type: ProductKind
  name: string
  quantity: number
  unit_price_cents: number
  total_price_cents: number
}

export type GuestCheckoutSnapshot = {
  parent_id: string
  line_items: GuestCheckoutLineItem[]
  total_cents: number
  currency: 'BRL'
}

function normalizeProductKind(raw: unknown): ProductKind {
  const value = String(raw ?? '').trim().toUpperCase()
  if (value === 'TICKET') return 'TICKET'
  if (value === 'GIFT') return 'GIFT'
  return 'MERCH'
}

function lineItemFromProduct(
  product: Product,
  product_type: ProductKind,
  name?: string,
): GuestCheckoutLineItem {
  const unit_price_cents = product.is_free ? 0 : product.value
  return {
    product_id: product.id,
    product_type,
    name: name ?? product.name,
    quantity: 1,
    unit_price_cents,
    total_price_cents: unit_price_cents,
  }
}

export function normalizeCheckoutLineItem(raw: unknown): GuestCheckoutLineItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const product_id = String(item.product_id ?? item.productId ?? '').trim()
  if (!product_id) return null
  const quantity = Number(item.quantity ?? 1)
  const unit_price_cents = Number(item.unit_price_cents ?? item.unitPriceCents ?? 0)
  const total_price_cents = Number(
    item.total_price_cents ?? item.totalPriceCents ?? unit_price_cents * quantity,
  )
  return {
    product_id,
    product_type: normalizeProductKind(item.product_type ?? item.productType),
    name: String(item.name ?? ''),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit_price_cents: Number.isFinite(unit_price_cents) ? unit_price_cents : 0,
    total_price_cents: Number.isFinite(total_price_cents) ? total_price_cents : 0,
  }
}

export function normalizeCheckoutSnapshot(raw: unknown): GuestCheckoutSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const checkout = raw as Record<string, unknown>
  const parent_id = String(
    checkout.parent_id ?? checkout.parentId ?? checkout.event_id ?? checkout.eventId ?? '',
  ).trim()
  if (!parent_id) return null
  const rawItems = checkout.line_items ?? checkout.lineItems
  const line_items = Array.isArray(rawItems)
    ? rawItems
        .map(normalizeCheckoutLineItem)
        .filter((item): item is GuestCheckoutLineItem => item !== null)
    : []
  const total_cents = Number(checkout.total_cents ?? checkout.totalCents ?? 0)
  return {
    parent_id,
    line_items,
    total_cents: Number.isFinite(total_cents)
      ? total_cents
      : line_items.reduce((sum, item) => sum + item.total_price_cents, 0),
    currency: 'BRL',
  }
}

export function countAttendingGuests(guestSlots: GuestConfirmFormSlot[]): number {
  return guestSlots.filter((slot) => slot.attending !== false).length
}

export function buildTicketLineItemsForAttendingGuests(
  ticket: Product,
  guestSlots: GuestConfirmFormSlot[],
): GuestCheckoutLineItem[] {
  return guestSlots
    .filter((slot) => slot.attending !== false)
    .map((slot) => {
      const guestName = slot.firstName.trim()
      const label = guestName ? `${ticket.name} — ${guestName}` : ticket.name
      return lineItemFromProduct(ticket, 'TICKET', label)
    })
}

export function buildGiftLineItemsFromProducts(products: Product[]): GuestCheckoutLineItem[] {
  return products.map((product) => lineItemFromProduct(product, 'GIFT'))
}

export function giftCheckoutLineItems(
  checkout: GuestCheckoutSnapshot,
): GuestCheckoutLineItem[] {
  return checkout.line_items.filter((item) => item.product_type === 'GIFT')
}

export function giftCheckoutTotalCents(checkout: GuestCheckoutSnapshot): number {
  return giftCheckoutLineItems(checkout).reduce(
    (sum, item) => sum + item.total_price_cents,
    0,
  )
}

export function splitCheckoutLineItemsByTicketId(
  line_items: GuestCheckoutLineItem[],
  _ticket_id: string | undefined,
): { ticket_line_items: GuestCheckoutLineItem[]; gift_line_items: GuestCheckoutLineItem[] } {
  return {
    ticket_line_items: line_items.filter((item) => item.product_type === 'TICKET'),
    gift_line_items: line_items.filter((item) => item.product_type === 'GIFT'),
  }
}

export function buildGuestCheckoutSnapshot(
  parent_id: string,
  ticket: Product | null,
  guestSlots: GuestConfirmFormSlot[],
  giftProducts: Product[],
): GuestCheckoutSnapshot {
  const ticket_line_items = ticket
    ? buildTicketLineItemsForAttendingGuests(ticket, guestSlots)
    : []
  const gift_line_items = buildGiftLineItemsFromProducts(giftProducts)
  const line_items = [...ticket_line_items, ...gift_line_items]
  const total_cents = line_items.reduce((sum, item) => sum + item.total_price_cents, 0)

  return {
    parent_id,
    line_items,
    total_cents,
    currency: 'BRL',
  }
}

export function refreshGuestCheckoutWithAttendingTickets(
  checkout: GuestCheckoutSnapshot,
  ticket: Product | null,
  guestSlots: GuestConfirmFormSlot[],
): GuestCheckoutSnapshot {
  if (!ticket) return checkout

  const { gift_line_items } = splitCheckoutLineItemsByTicketId(
    checkout.line_items,
    ticket.id,
  )
  const giftProducts: Product[] = gift_line_items.map((item) => ({
    id: item.product_id,
    name: item.name,
    description: '',
    user_id: '',
    is_free: item.unit_price_cents === 0,
    value: item.unit_price_cents,
    quantity: item.quantity,
    max_per_user: 1,
    active: true,
    created_at: '',
    updated_at: '',
    created_by: '',
    last_updated_by: '',
  }))

  return buildGuestCheckoutSnapshot(checkout.parent_id, ticket, guestSlots, giftProducts)
}

export function buildCheckoutSnapshotFromProducts(
  parent_id: string,
  products: Product[],
): GuestCheckoutSnapshot {
  const line_items = buildGiftLineItemsFromProducts(products)
  const total_cents = line_items.reduce((sum, item) => sum + item.total_price_cents, 0)
  return {
    parent_id,
    line_items,
    total_cents,
    currency: 'BRL',
  }
}

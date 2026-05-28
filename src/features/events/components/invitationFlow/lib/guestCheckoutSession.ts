import type { Product, ProductKind } from '@/shared/types/api'
import type { GuestConfirmFormSlot } from './guestConfirmMock'
import {
  normalizeGuestPaymentProvider,
  type GuestPaymentProviderId,
} from './guestPaymentProvider'

export type GuestCheckoutLineItem = {
  product_id: string
  product_type: ProductKind
  name: string
  quantity: number
  unit_price: number
  total_price: number
}

export type GuestCheckoutSnapshot = {
  parent_id: string
  items: GuestCheckoutLineItem[]
  total_cents: number
  currency: 'BRL'
  payment_provider?: GuestPaymentProviderId
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
  const unit_price = product.is_free ? 0 : product.value
  return {
    product_id: product.id,
    product_type,
    name: name ?? product.name,
    quantity: 1,
    unit_price,
    total_price: unit_price,
  }
}

export function normalizeCheckoutLineItem(raw: unknown): GuestCheckoutLineItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const product_id = String(item.product_id ?? item.productId ?? '').trim()
  if (!product_id) return null
  const quantity = Number(item.quantity ?? 1)
  const unit_price = Number(
    item.unit_price ??
      item.unitPrice ??
      item.unit_price_cents ??
      item.unitPriceCents ??
      0,
  )
  const total_price = Number(
    item.total_price ??
      item.totalPrice ??
      item.total_price_cents ??
      item.totalPriceCents ??
      unit_price * quantity,
  )
  return {
    product_id,
    product_type: normalizeProductKind(item.product_type ?? item.productType),
    name: String(item.name ?? ''),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit_price: Number.isFinite(unit_price) ? unit_price : 0,
    total_price: Number.isFinite(total_price) ? total_price : 0,
  }
}

export function normalizeCheckoutSnapshot(raw: unknown): GuestCheckoutSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const checkout = raw as Record<string, unknown>
  const parent_id = String(
    checkout.parent_id ?? checkout.parentId ?? checkout.event_id ?? checkout.eventId ?? '',
  ).trim()
  if (!parent_id) return null
  const rawItems = checkout.items ?? checkout.line_items ?? checkout.lineItems
  const items = Array.isArray(rawItems)
    ? rawItems
        .map(normalizeCheckoutLineItem)
        .filter((item): item is GuestCheckoutLineItem => item !== null)
    : []
  const total_cents = Number(checkout.total_cents ?? checkout.totalCents ?? 0)
  const payment_provider = normalizeGuestPaymentProvider(checkout.payment_provider)
  return {
    parent_id,
    items,
    total_cents: Number.isFinite(total_cents)
      ? total_cents
      : items.reduce((sum, item) => sum + item.total_price, 0),
    currency: 'BRL',
    ...(payment_provider ? { payment_provider } : {}),
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
  return checkout.items.filter((item) => item.product_type === 'GIFT')
}

export function giftCheckoutTotalCents(checkout: GuestCheckoutSnapshot): number {
  return giftCheckoutLineItems(checkout).reduce(
    (sum, item) => sum + item.total_price,
    0,
  )
}

export function splitCheckoutItemsByType(
  items: GuestCheckoutLineItem[],
  _ticket_id: string | undefined,
): { ticket_items: GuestCheckoutLineItem[]; gift_items: GuestCheckoutLineItem[] } {
  return {
    ticket_items: items.filter((item) => item.product_type === 'TICKET'),
    gift_items: items.filter((item) => item.product_type === 'GIFT'),
  }
}

export function buildGuestCheckoutSnapshot(
  parent_id: string,
  ticket: Product | null,
  guestSlots: GuestConfirmFormSlot[],
  giftProducts: Product[],
): GuestCheckoutSnapshot {
  const ticket_items = ticket
    ? buildTicketLineItemsForAttendingGuests(ticket, guestSlots)
    : []
  const gift_items = buildGiftLineItemsFromProducts(giftProducts)
  const items = [...ticket_items, ...gift_items]
  const total_cents = items.reduce((sum, item) => sum + item.total_price, 0)

  return {
    parent_id,
    items,
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

  const { gift_items } = splitCheckoutItemsByType(checkout.items, ticket.id)
  const giftProducts: Product[] = gift_items.map((item) => ({
    id: item.product_id,
    name: item.name,
    description: '',
    user_id: '',
    is_free: item.unit_price === 0,
    value: item.unit_price,
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
  const items = buildGiftLineItemsFromProducts(products)
  const total_cents = items.reduce((sum, item) => sum + item.total_price, 0)
  return {
    parent_id,
    items,
    total_cents,
    currency: 'BRL',
  }
}

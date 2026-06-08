import type { TFunction } from 'i18next'
import type { InvitationGuestSlotView, InvitationPaymentOrderItem } from './guestInvitationApi'

export type GuestFinishedPaymentLineItem = {
  key: string
  title: string
  subtitle?: string
  kind: 'ticket' | 'gift'
}

function formatLineItemPrice(
  totalPriceCents: number,
  currency: string,
  freeLabel: string,
): string {
  if (totalPriceCents === 0) return freeLabel
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'BRL',
  }).format(totalPriceCents / 100)
}

function isTicketOrderItem(item: InvitationPaymentOrderItem): boolean {
  return (item.product_type ?? '').toUpperCase() === 'TICKET' || Boolean(item.guest_slot_id)
}

export function buildGuestFinishedPaymentLineItems(
  items: InvitationPaymentOrderItem[],
  context: {
    slotById: Map<string, InvitationGuestSlotView>
    currency: string
    t: TFunction
  },
): GuestFinishedPaymentLineItem[] {
  const { slotById, currency, t } = context

  return items.map((item) => {
    const isTicket = isTicketOrderItem(item)
    const title = item.name?.trim() || item.product_id
    const subtitleParts: string[] = []

    if (isTicket && item.guest_slot_id) {
      const guestName = slotById.get(item.guest_slot_id)?.first_name?.trim()
      if (guestName) {
        subtitleParts.push(t('events.detail.guestFinished.paymentItemGuest', { name: guestName }))
      }
    }

    if (item.quantity > 1) {
      subtitleParts.push(t('events.detail.guestFinished.paymentItemQuantity', { count: item.quantity }))
    }

    subtitleParts.push(
      formatLineItemPrice(item.total_price, currency, t('events.detail.guestGift.free')),
    )

    return {
      key: item.id,
      title,
      subtitle: subtitleParts.join(' · '),
      kind: isTicket ? 'ticket' : 'gift',
    }
  })
}

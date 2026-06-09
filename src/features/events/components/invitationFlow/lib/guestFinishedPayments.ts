import type { TFunction } from 'i18next'
import type { InvitationPaymentOrderItem, InvitationSpotView } from './guestInvitationApi'

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
  return (item.product_type ?? '').toUpperCase() === 'TICKET' || Boolean(item.spot_id)
}

export function buildGuestFinishedPaymentLineItems(
  items: InvitationPaymentOrderItem[],
  context: {
    spotById: Map<string, InvitationSpotView>
    currency: string
    t: TFunction
  },
): GuestFinishedPaymentLineItem[] {
  const { spotById, currency, t } = context

  return items.map((item) => {
    const isTicket = isTicketOrderItem(item)
    const title = item.name?.trim() || item.product_id
    const subtitleParts: string[] = []

    if (isTicket && item.spot_id) {
      const guestName = spotById.get(item.spot_id)?.name?.trim()
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

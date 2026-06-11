import {
  CalendarOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  MailOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'
import type { InvitationStatus } from '@/shared/types/api'

export type EventEditTabKey =
  | 'details'
  | 'venue'
  | 'schedule'
  | 'products'
  | 'tickets'
  | 'invitations'

export type ProductSubNavKey = 'catalog' | 'sales'
export type TicketSubNavKey = ProductSubNavKey
export type InvitationSubNavKey = 'catalog' | 'guests'

export function eventEditMerchDashboardPath(eventId: string): string {
  return `/events/${eventId}/edit/products`
}

export const EVENT_EDIT_TAB_ORDER: EventEditTabKey[] = [
  'details',
  'venue',
  'schedule',
  'products',
  'tickets',
  'invitations',
]

export const EVENT_EDIT_TAB_KEYS = EVENT_EDIT_TAB_ORDER as readonly EventEditTabKey[]

export function isEventEditTabKey(s: string | undefined): s is EventEditTabKey {
  return !!s && EVENT_EDIT_TAB_KEYS.includes(s as EventEditTabKey)
}

export function eventEditTicketDashboardPath(eventId: string): string {
  return `/events/${eventId}/edit/tickets`
}

export function eventEditInvitationDashboardPath(eventId: string): string {
  return `/events/${eventId}/edit/invitations`
}

export function eventEditTabPath(eventId: string, tab: EventEditTabKey): string {
  if (tab === 'products') return eventEditMerchDashboardPath(eventId)
  if (tab === 'tickets') return eventEditTicketDashboardPath(eventId)
  if (tab === 'invitations') return eventEditInvitationDashboardPath(eventId)
  return `/events/${eventId}/edit/${tab}`
}

export function eventEditMerchCatalogPath(eventId: string): string {
  return `/events/${eventId}/edit/products/catalog`
}

export function eventEditMerchNewPath(eventId: string): string {
  return `/events/${eventId}/edit/products/new`
}

export function eventEditMerchSalesPath(
  eventId: string,
  opts?: { productId?: string | null },
): string {
  const base = `/events/${eventId}/edit/products/sales`
  if (!opts?.productId) return base
  return `${base}?product=${encodeURIComponent(opts.productId)}`
}

export function eventEditMerchEditPath(eventId: string, productId: string): string {
  return `/events/${eventId}/edit/products/${productId}`
}

export function eventEditTicketCatalogPath(eventId: string): string {
  return `/events/${eventId}/edit/tickets/catalog`
}

export function eventEditTicketSalesPath(
  eventId: string,
  opts?: { ticketId?: string | null },
): string {
  const base = `/events/${eventId}/edit/tickets/sales`
  if (!opts?.ticketId) return base
  return `${base}?ticket=${encodeURIComponent(opts.ticketId)}`
}

export function eventEditTicketNewPath(eventId: string): string {
  return `/events/${eventId}/edit/tickets/new`
}

export function eventEditTicketEditPath(eventId: string, ticketId: string): string {
  return `/events/${eventId}/edit/tickets/${ticketId}`
}

export function eventEditInvitationCatalogPath(
  eventId: string,
  opts?: {
    status?: InvitationStatus | null
    expiringWithin7Days?: boolean
    expired?: boolean
  },
): string {
  const base = `/events/${eventId}/edit/invitations/catalog`
  const params = new URLSearchParams()
  if (opts?.status) params.set('status', opts.status)
  if (opts?.expired) params.set('expiring', 'expired')
  else if (opts?.expiringWithin7Days) params.set('expiring', '7')
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function eventEditInvitationGuestsPath(
  eventId: string,
  opts?: { invitationId?: string | null },
): string {
  const base = `/events/${eventId}/edit/invitations/guests`
  if (!opts?.invitationId) return base
  return `${base}?invitation=${encodeURIComponent(opts.invitationId)}`
}

export function eventEditInvitationNewPath(eventId: string): string {
  return `/events/${eventId}/edit/invitations/new`
}

export function eventEditInvitationEditPath(eventId: string, invitationId: string): string {
  return `/events/${eventId}/edit/invitations/${invitationId}`
}

export const EVENT_EDIT_TAB_ICONS: Record<EventEditTabKey, React.ReactNode> = {
  details: <FileTextOutlined />,
  venue: <EnvironmentOutlined />,
  schedule: <CalendarOutlined />,
  products: <ShoppingOutlined />,
  tickets: <CreditCardOutlined />,
  invitations: <MailOutlined />,
}

function resolveSectionSubNavFromPathname(
  pathname: string,
  eventId: string,
  section: 'products' | 'tickets' | 'invitations',
): ProductSubNavKey | null {
  const base = `/events/${eventId}/edit/${section}`
  if (pathname === base || pathname === `${base}/`) return null
  const catalogPrefix = `${base}/catalog`
  if (pathname.startsWith(catalogPrefix)) return 'catalog'
  if (section === 'invitations') return null
  const salesPrefix = `${base}/sales`
  if (pathname.startsWith(salesPrefix)) return 'sales'
  return null
}

export function resolveProductSubNavFromPathname(
  pathname: string,
  eventId: string,
): ProductSubNavKey | null {
  return resolveSectionSubNavFromPathname(pathname, eventId, 'products')
}

export function resolveTicketSubNavFromPathname(
  pathname: string,
  eventId: string,
): TicketSubNavKey | null {
  return resolveSectionSubNavFromPathname(pathname, eventId, 'tickets')
}

export function resolveInvitationSubNavFromPathname(
  pathname: string,
  eventId: string,
): InvitationSubNavKey | null {
  const base = `/events/${eventId}/edit/invitations`
  if (pathname === base || pathname === `${base}/`) return null
  if (pathname.startsWith(`${base}/catalog`)) return 'catalog'
  if (pathname.startsWith(`${base}/guests`)) return 'guests'
  return null
}

export function resolveEditTabFromPathname(pathname: string, eventId: string): EventEditTabKey | null {
  const prefix = `/events/${eventId}/edit/`
  if (!pathname.startsWith(prefix)) return null
  const rest = pathname.slice(prefix.length)
  const segment = rest.split('/')[0]
  if (segment === 'products' || rest.startsWith('products/')) return 'products'
  if (segment === 'tickets' || rest.startsWith('tickets/')) return 'tickets'
  if (segment === 'invitations' || rest.startsWith('invitations/')) return 'invitations'
  return isEventEditTabKey(segment) ? segment : null
}

export function isEditSubEditorPath(pathname: string, eventId: string): boolean {
  const prefix = `/events/${eventId}/edit/`
  if (!pathname.startsWith(prefix)) return false
  const rest = pathname.slice(prefix.length)
  return (
    rest.startsWith('products/new') ||
    (/^products\/[^/]+$/.test(rest) &&
      rest !== 'products/sales' &&
      rest !== 'products/catalog' &&
      rest !== 'products') ||
    rest.startsWith('tickets/new') ||
    (/^tickets\/[^/]+$/.test(rest) &&
      rest !== 'tickets/sales' &&
      rest !== 'tickets/catalog' &&
      rest !== 'tickets') ||
    rest.startsWith('invitations/new') ||
    (/^invitations\/[^/]+$/.test(rest) &&
      rest !== 'invitations/catalog' &&
      rest !== 'invitations/guests' &&
      rest !== 'invitations')
  )
}

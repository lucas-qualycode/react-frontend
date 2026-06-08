import {
  CalendarOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  MailOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'

export type EventEditTabKey =
  | 'details'
  | 'venue'
  | 'schedule'
  | 'products'
  | 'tickets'
  | 'invitations'

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

export function eventEditTabPath(eventId: string, tab: EventEditTabKey): string {
  return `/events/${eventId}/edit/${tab}`
}

export function eventEditMerchNewPath(eventId: string): string {
  return `/events/${eventId}/edit/products/new`
}

export function eventEditMerchEditPath(eventId: string, productId: string): string {
  return `/events/${eventId}/edit/products/${productId}`
}

export function eventEditTicketNewPath(eventId: string): string {
  return `/events/${eventId}/edit/tickets/new`
}

export function eventEditTicketEditPath(eventId: string, ticketId: string): string {
  return `/events/${eventId}/edit/tickets/${ticketId}`
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
    /^products\/[^/]+$/.test(rest) ||
    rest.startsWith('tickets/new') ||
    /^tickets\/[^/]+$/.test(rest) ||
    rest.startsWith('invitations/new') ||
    /^invitations\/[^/]+$/.test(rest)
  )
}

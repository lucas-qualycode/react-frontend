export type CreateWizardStepKey =
  | 'identity'
  | 'venue'
  | 'schedule'
  | 'products'
  | 'tickets'
  | 'invitations'

export const CREATE_WIZARD_STEP_ORDER: CreateWizardStepKey[] = [
  'identity',
  'venue',
  'schedule',
  'products',
  'tickets',
  'invitations',
]

export function isCreateWizardStepKey(s: string | undefined): s is CreateWizardStepKey {
  return !!s && CREATE_WIZARD_STEP_ORDER.includes(s as CreateWizardStepKey)
}

export function createWizardIdentityPath(eventId?: string): string {
  return eventId ? `/events/new/${eventId}/identity` : '/events/new/identity'
}

export function createWizardVenuePath(eventId: string): string {
  return `/events/new/${eventId}/venue`
}

export function createWizardSchedulePath(eventId: string): string {
  return `/events/new/${eventId}/schedule`
}

export function createWizardProductsPath(eventId: string): string {
  return `/events/new/${eventId}/products`
}

export function createWizardTicketsPath(eventId: string): string {
  return `/events/new/${eventId}/tickets`
}

export function createWizardInvitationsPath(eventId: string): string {
  return `/events/new/${eventId}/invitations`
}

export function createWizardMerchNewPath(eventId: string): string {
  return `/events/new/${eventId}/products/new`
}

export function createWizardMerchEditPath(eventId: string, productId: string): string {
  return `/events/new/${eventId}/products/${productId}`
}

export function createWizardTicketNewPath(eventId: string): string {
  return `/events/new/${eventId}/tickets/new`
}

export function createWizardTicketEditPath(eventId: string, ticketId: string): string {
  return `/events/new/${eventId}/tickets/${ticketId}`
}

export function createWizardInvitationNewPath(eventId: string): string {
  return `/events/new/${eventId}/invitations/new`
}

export function createWizardInvitationEditPath(eventId: string, invitationId: string): string {
  return `/events/new/${eventId}/invitations/${invitationId}`
}

export function createWizardStepIndex(step: CreateWizardStepKey): number {
  return CREATE_WIZARD_STEP_ORDER.indexOf(step)
}

export function resolveCreateWizardStepFromPathname(pathname: string): CreateWizardStepKey {
  if (pathname.includes('/invitations')) return 'invitations'
  if (pathname.includes('/tickets')) return 'tickets'
  if (pathname.includes('/products')) return 'products'
  if (pathname.endsWith('/schedule')) return 'schedule'
  if (pathname.endsWith('/venue')) return 'venue'
  if (pathname.endsWith('/identity')) return 'identity'
  return 'identity'
}

export function isCreateWizardSubEditorPath(pathname: string, eventId: string): boolean {
  const prefix = `/events/new/${eventId}/`
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

export function createWizardStepPath(step: CreateWizardStepKey, eventId: string | undefined): string {
  switch (step) {
    case 'identity':
      return createWizardIdentityPath(eventId)
    case 'venue':
      return eventId ? createWizardVenuePath(eventId) : createWizardIdentityPath()
    case 'schedule':
      return eventId ? createWizardSchedulePath(eventId) : createWizardIdentityPath()
    case 'products':
      return eventId ? createWizardProductsPath(eventId) : createWizardIdentityPath()
    case 'tickets':
      return eventId ? createWizardTicketsPath(eventId) : createWizardIdentityPath()
    case 'invitations':
      return eventId ? createWizardInvitationsPath(eventId) : createWizardIdentityPath()
  }
}

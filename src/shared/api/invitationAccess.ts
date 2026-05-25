export type InvitationAccess = {
  invitationId: string
  token: string
}

export function appendInvitationAccessQuery(
  path: string,
  access?: InvitationAccess | null,
  opts?: { includeInvitationId?: boolean },
): string {
  if (!access?.token?.trim()) {
    return path
  }
  const qIndex = path.indexOf('?')
  const base = qIndex >= 0 ? path.slice(0, qIndex) : path
  const params = new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : '')
  params.set('token', access.token.trim())
  if (opts?.includeInvitationId !== false && access.invitationId) {
    params.set('invitation_id', access.invitationId)
  }
  return `${base}?${params.toString()}`
}

export function invitationAccessHeaders(
  access?: InvitationAccess | null,
  init?: RequestInit,
): Headers {
  const headers = new Headers(init?.headers)
  const t = access?.token?.trim()
  if (t) {
    headers.set('X-Invitation-Token', t)
  }
  return headers
}

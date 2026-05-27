export type InvitationAccess = {
  invitationId: string
  token: string
}

export type InvitationAccessFailureCode =
  | 'invitation_expired'
  | 'invitation_access_token_invalid'

export class InvitationAccessFailure extends Error {
  readonly code: InvitationAccessFailureCode

  constructor(code: InvitationAccessFailureCode) {
    super(code)
    this.name = 'InvitationAccessFailure'
    this.code = code
  }
}

export function isInvitationAccessFailure(
  error: unknown,
): error is InvitationAccessFailure {
  return error instanceof InvitationAccessFailure
}

export async function readApiErrorDetail(res: Response): Promise<string | null> {
  try {
    const j = (await res.json()) as { error?: unknown; detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
    if (typeof j.error === 'string') return j.error
  } catch {
    /* ignore */
  }
  return null
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

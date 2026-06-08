const STORAGE_PREFIX = 'partiiu:invitation-access:'

export function storageKeyForInvitation(invitationId: string): string {
  return `${STORAGE_PREFIX}${invitationId}`
}

export function getStoredInvitationAccessToken(invitationId: string): string | null {
  try {
    const raw = sessionStorage.getItem(storageKeyForInvitation(invitationId))
    return raw?.trim() ? raw.trim() : null
  } catch {
    return null
  }
}

export function setStoredInvitationAccessToken(invitationId: string, token: string): void {
  try {
    sessionStorage.setItem(storageKeyForInvitation(invitationId), token.trim())
  } catch {
    /* quota or private mode */
  }
}

export function guestInvitationHref(
  eventId: string,
  invitationId: string,
  accessToken?: string | null,
): string {
  const base = `/events/${eventId}/invitation/${invitationId}`
  const t = accessToken?.trim()
  if (!t) return base
  return `${base}?token=${encodeURIComponent(t)}`
}

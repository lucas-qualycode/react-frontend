export const MS_PER_DAY = 86400000

export function daysUntilExpiry(iso: string): number | null {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return null
  const now = new Date()
  const expiry = new Date(ms)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate())
  return Math.round((startOfExpiry.getTime() - startOfToday.getTime()) / MS_PER_DAY)
}

export function isInvitationExpired(iso: string): boolean {
  const ms = Date.parse(iso)
  return !Number.isNaN(ms) && ms <= Date.now()
}

export function isInvitationExpiringWithin7Days(iso: string): boolean {
  if (isInvitationExpired(iso)) return false
  const days = daysUntilExpiry(iso)
  return days !== null && days >= 0 && days <= 7
}

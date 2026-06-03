export function formatPixExpiryCountdown(
  totalSeconds: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return t('events.detail.guestPayment.expiresDaysHours', { days, hours })
  }
  if (hours > 0) {
    return t('events.detail.guestPayment.expiresHoursMinutes', { hours, minutes })
  }
  return t('events.detail.guestPayment.expiresMinutes', {
    minutes: Math.max(1, minutes),
  })
}

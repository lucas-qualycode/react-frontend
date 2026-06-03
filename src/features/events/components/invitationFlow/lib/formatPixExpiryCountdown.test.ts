import { describe, expect, it } from 'vitest'
import { formatPixExpiryCountdown } from './formatPixExpiryCountdown'

const t = (key: string, options?: Record<string, unknown>) => {
  if (key === 'events.detail.guestPayment.expiresDaysHours') {
    return `${options?.days}d ${options?.hours}h`
  }
  if (key === 'events.detail.guestPayment.expiresHoursMinutes') {
    return `${options?.hours}h ${options?.minutes}m`
  }
  if (key === 'events.detail.guestPayment.expiresMinutes') {
    return `${options?.minutes} min`
  }
  return key
}

describe('formatPixExpiryCountdown', () => {
  it('formats multi-day expiry as days and hours', () => {
    expect(formatPixExpiryCountdown(90000, t)).toBe('1d 1h')
  })

  it('formats sub-day expiry as hours and minutes', () => {
    expect(formatPixExpiryCountdown(85938, t)).toBe('23h 52m')
  })

  it('formats sub-hour expiry as minutes', () => {
    expect(formatPixExpiryCountdown(900, t)).toBe('15 min')
  })
})

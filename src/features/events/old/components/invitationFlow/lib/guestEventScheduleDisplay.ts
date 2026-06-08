import type { Event } from '@/shared/types/api'
import { schedulesFromEvent } from '@/features/events/scheduleList'
import { scheduleEventStart } from './scheduleEventZoned'

export type ScheduleWhenParts = {
  date: string
  time: string
}

export function formatScheduleWhenParts(
  lang: string,
  sched: { timezone: string },
  start: ReturnType<typeof scheduleEventStart>,
): ScheduleWhenParts | null {
  if (!start?.isValid()) return null
  const locale = lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
  const timeZone = sched.timezone.trim()
  const instant = start.toDate()
  try {
    const date = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    }).format(instant)
    const time = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(instant)
    return { date, time }
  } catch {
    return {
      date: start.format('MMMM D, YYYY'),
      time: start.format('h:mm A'),
    }
  }
}

export function resolveGuestEventVenueLine(event: Event): string | null {
  if (event.is_online || !event.location) return null
  return [event.location.venue_name, event.location.formatted_address].filter(Boolean).join(' · ') || null
}

export function resolveGuestEventMapsUrl(event: Event): string | null {
  if (event.is_online || !event.location?.maps_url?.trim()) return null
  return event.location.maps_url.trim()
}

export function resolveGuestEventScheduleWhen(
  event: Event,
  language: string,
): ScheduleWhenParts | null {
  const schedules = schedulesFromEvent(event)
  const primarySchedule = schedules[0]
  if (!primarySchedule) return null
  const startZoned = scheduleEventStart(primarySchedule)
  if (!startZoned?.isValid()) return null
  return formatScheduleWhenParts(language, primarySchedule, startZoned)
}

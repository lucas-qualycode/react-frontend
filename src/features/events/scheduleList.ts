import type { Event, Schedule } from '@/shared/types/api'

export function compareScheduleByCreatedAtAsc(a: Schedule, b: Schedule): number {
  const at = new Date(a.created_at).getTime()
  const bt = new Date(b.created_at).getTime()
  return at - bt
}

export function schedulesFromEvent(event: Event | null | undefined): Schedule[] {
  return (event?.schedules ?? []).slice().sort(compareScheduleByCreatedAtAsc)
}

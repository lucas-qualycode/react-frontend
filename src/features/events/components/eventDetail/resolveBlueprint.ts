import type { Event } from '@/shared/types/api'
import type { EventDetailSlot } from './types'

export function resolveEventDetailBlueprint(event: Event): EventDetailSlot[] {
  if (event.primary_category === 'wedding') {
    return [{ blockId: 'guest_welcome', variant: 'wedding' }]
  }
  return []
}

import type { Event } from '@/shared/types/api'
import type { EventDetailSlot, EventHeroVariant } from './types'

function resolveHeroVariant(primary: Event['primary_category']): EventHeroVariant {
  if (primary === 'wedding') return 'wedding'
  return 'default'
}

export function resolveEventDetailBlueprint(event: Event): EventDetailSlot[] {
  const hero: EventDetailSlot = { blockId: 'hero', variant: resolveHeroVariant(event.primary_category) }
  if (event.primary_category === 'wedding') {
    return [{ blockId: 'couple_story', variant: 'wedding' }]
  }
  return [hero]
}

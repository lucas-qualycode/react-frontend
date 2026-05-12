export type EventDetailBlockId = 'hero' | 'couple_story'

export type EventHeroVariant = 'wedding' | 'default'

export type EventCoupleStoryVariant = 'wedding'

export type EventDetailSlot =
  | { blockId: 'hero'; variant: EventHeroVariant }
  | { blockId: 'couple_story'; variant: EventCoupleStoryVariant }

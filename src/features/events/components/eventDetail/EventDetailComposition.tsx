import { Flex } from 'antd'
import type { Event } from '@/shared/types/api'
import { EventCoupleStoryBlock } from './blocks/EventCoupleStoryBlock'
import { EventHeroBlock } from './blocks/EventHeroBlock'
import { resolveEventDetailBlueprint } from './resolveBlueprint'

type Props = {
  event: Event
}

export function EventDetailComposition({ event }: Props) {
  const slots = resolveEventDetailBlueprint(event)

  return (
    <Flex vertical gap={24}>
      {slots.map((slot, index) => {
        if (slot.blockId === 'hero') {
          return <EventHeroBlock key={`hero-${index}`} event={event} variant={slot.variant} />
        }
        if (slot.blockId === 'couple_story') {
          return (
            <EventCoupleStoryBlock key={`couple_story-${index}`} event={event} variant={slot.variant} />
          )
        }
        return null
      })}
    </Flex>
  )
}

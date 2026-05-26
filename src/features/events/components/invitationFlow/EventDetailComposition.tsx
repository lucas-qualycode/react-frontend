import type { Event } from '@/shared/types/api'
import { EventGuestFlow } from './EventGuestFlow'
import { resolveEventDetailBlueprint } from './resolveBlueprint'

type Props = {
  event: Event
  invitationId?: string
}

export function EventDetailComposition({ event, invitationId }: Props) {
  const slots = resolveEventDetailBlueprint(event)

  return (
    <>
      {slots.map((slot, index) => {
        if (slot.blockId === 'guest_welcome') {
          return (
            <EventGuestFlow
              key={`guest-flow-${index}`}
              event={event}
              invitationId={invitationId}
              backgroundVariant="wedding"
              welcomeVariant={slot.variant}
              confirmVariant="wedding"
              giftVariant="wedding"
              mpPaymentVariant="wedding"
              messageVariant="wedding"
              reviewVariant="wedding"
            />
          )
        }
        return null
      })}
    </>
  )
}

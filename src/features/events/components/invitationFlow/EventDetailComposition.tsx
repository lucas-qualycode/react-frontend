import type { Event } from '@/shared/types/api'
import { EventGuestBackgroundBlock } from '../blocks/background/EventGuestBackgroundBlock'
import { EventGuestWelcomeBlock } from '../blocks/welcome/EventGuestWelcomeBlock'
import { EventGuestFlow } from './EventGuestFlow'
import { resolveEventDetailBlueprint } from './resolveBlueprint'
import type { EventGuestWelcomeVariant } from './types'

type Props = {
  event: Event
  invitationId?: string
}

function EventGuestWelcomePreview({
  event,
  welcomeVariant,
}: {
  event: Event
  welcomeVariant: EventGuestWelcomeVariant
}) {
  return (
    <div className="guest-flow-viewport guest-flow-viewport--content-panel" style={{ minHeight: 360 }}>
      <EventGuestBackgroundBlock variant="wedding" />
      <EventGuestWelcomeBlock event={event} variant={welcomeVariant} />
    </div>
  )
}

export function EventDetailComposition({ event, invitationId }: Props) {
  const slots = resolveEventDetailBlueprint(event)

  return (
    <>
      {slots.map((slot, index) => {
        if (slot.blockId === 'guest_welcome') {
          if (!invitationId) {
            return (
              <EventGuestWelcomePreview
                key={`guest-welcome-preview-${index}`}
                event={event}
                welcomeVariant={slot.variant}
              />
            )
          }
          return (
            <EventGuestFlow
              key={`guest-flow-${index}`}
              event={event}
              invitationId={invitationId}
              backgroundVariant="wedding"
              welcomeVariant={slot.variant}
              guestsVariant="wedding"
              giftsVariant="wedding"
              messageVariant="wedding"
              finishedVariant="wedding"
            />
          )
        }
        return null
      })}
    </>
  )
}

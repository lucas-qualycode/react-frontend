import type { EventGuestBackgroundVariant } from '../../invitationFlow/types'
import { EventGuestFallingFlowers } from '../fallingFlowers/EventGuestFallingFlowers'
import './eventGuestBackground.css'

type Props = {
  variant: EventGuestBackgroundVariant
}

export function EventGuestBackgroundBlock({ variant }: Props) {
  if (variant !== 'wedding') return null

  return (
    <div className="guest-flow-background" aria-hidden>
      <div className="guest-flow-background-gradient" />
      <EventGuestFallingFlowers variant={variant} />
    </div>
  )
}

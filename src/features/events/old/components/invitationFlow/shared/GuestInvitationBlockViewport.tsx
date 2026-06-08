import type { ReactNode } from 'react'
import { EventGuestBackgroundBlock } from '../../blocks/background/EventGuestBackgroundBlock'
import '../eventGuestFlow.css'

type Props = {
  children: ReactNode
}

export function GuestInvitationBlockViewport({ children }: Props) {
  return (
    <div className="guest-flow-viewport guest-flow-viewport--content-panel">
      <EventGuestBackgroundBlock variant="wedding" />
      <div className="guest-flow-track">
        <div className="guest-flow-slot">{children}</div>
      </div>
    </div>
  )
}

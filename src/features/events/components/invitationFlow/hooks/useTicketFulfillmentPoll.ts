import { useCallback, useEffect, useRef, useState } from 'react'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import {
  fetchInvitationGuestView,
  type InvitationGuestView,
} from '../lib/guestInvitationApi'

const TICKET_POLL_INTERVAL_MS = 1500
const TICKET_POLL_TIMEOUT_MS = 30_000

export type TicketFulfillmentPollState =
  | 'idle'
  | 'polling'
  | 'complete'
  | 'timeout'

type Params = {
  invitationId: string
  invitationAccess?: InvitationAccess | null
  pendingSpotIds: string[]
  enabled: boolean
  onComplete?: (view: InvitationGuestView) => void
}

function spotsFulfilled(view: InvitationGuestView, pendingSpotIds: string[]): boolean {
  if (pendingSpotIds.length === 0) return true
  return pendingSpotIds.every((spotId) => {
    const spot = view.spots.find((s) => s.id === spotId)
    return spot?.user_product?.status === 'ACTIVE'
  })
}

export function useTicketFulfillmentPoll({
  invitationId,
  invitationAccess,
  pendingSpotIds,
  enabled,
  onComplete,
}: Params) {
  const [state, setState] = useState<TicketFulfillmentPollState>('idle')
  const [guestView, setGuestView] = useState<InvitationGuestView | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const pollOnce = useCallback(async () => {
    const view = await fetchInvitationGuestView(invitationId, invitationAccess)
    setGuestView(view)
    return view
  }, [invitationAccess, invitationId])

  useEffect(() => {
    if (!enabled || pendingSpotIds.length === 0) {
      setState('idle')
      return
    }

    let cancelled = false
    setState('polling')
    const startedAt = Date.now()

    const tick = async () => {
      try {
        const view = await pollOnce()
        if (cancelled) return
        if (spotsFulfilled(view, pendingSpotIds)) {
          setState('complete')
          onCompleteRef.current?.(view)
          return true
        }
        if (Date.now() - startedAt >= TICKET_POLL_TIMEOUT_MS) {
          setState('timeout')
          return true
        }
      } catch {
        if (Date.now() - startedAt >= TICKET_POLL_TIMEOUT_MS) {
          setState('timeout')
          return true
        }
      }
      return false
    }

    void tick()
    const intervalId = window.setInterval(() => {
      void tick().then((done) => {
        if (done) window.clearInterval(intervalId)
      })
    }, TICKET_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [enabled, invitationAccess, invitationId, pendingSpotIds, pollOnce])

  const retry = useCallback(async () => {
    setState('polling')
    try {
      const view = await pollOnce()
      if (spotsFulfilled(view, pendingSpotIds)) {
        setState('complete')
        onCompleteRef.current?.(view)
      } else {
        setState('timeout')
      }
    } catch {
      setState('timeout')
    }
  }, [pendingSpotIds, pollOnce])

  return { state, guestView, retry }
}

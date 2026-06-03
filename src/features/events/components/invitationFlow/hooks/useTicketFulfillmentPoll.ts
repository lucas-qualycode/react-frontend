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
  pendingSlotIds: string[]
  enabled: boolean
  onComplete?: (view: InvitationGuestView) => void
}

function slotsFulfilled(view: InvitationGuestView, pendingSlotIds: string[]): boolean {
  if (pendingSlotIds.length === 0) return true
  return pendingSlotIds.every((slotId) => {
    const slot = view.guest_slots.find((s) => s.id === slotId)
    return slot?.user_product?.status === 'ACTIVE'
  })
}

export function useTicketFulfillmentPoll({
  invitationId,
  invitationAccess,
  pendingSlotIds,
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
    if (!enabled || pendingSlotIds.length === 0) {
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
        if (slotsFulfilled(view, pendingSlotIds)) {
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
  }, [enabled, invitationAccess, invitationId, pendingSlotIds, pollOnce])

  const retry = useCallback(async () => {
    setState('polling')
    try {
      const view = await pollOnce()
      if (slotsFulfilled(view, pendingSlotIds)) {
        setState('complete')
        onCompleteRef.current?.(view)
      } else {
        setState('timeout')
      }
    } catch {
      setState('timeout')
    }
  }, [pendingSlotIds, pollOnce])

  return { state, guestView, retry }
}

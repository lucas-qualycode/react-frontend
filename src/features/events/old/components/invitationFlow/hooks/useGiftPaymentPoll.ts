import { useCallback, useEffect, useRef, useState } from 'react'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import {
  fetchPaymentStatus,
  type GuestPaymentStatusResponse,
  type PixDisplayPayload,
} from '../lib/guestInvitationApi'

const GIFT_POLL_INTERVAL_MS = 2500

export type GiftPaymentPollState = 'idle' | 'polling' | 'approved' | 'failed' | 'cancelled'

type Params = {
  invitationId: string
  invitationAccess?: InvitationAccess | null
  paymentId: string | null
  enabled: boolean
  onTerminal?: (outcome: GuestPaymentStatusResponse) => void
}
export function useGiftPaymentPoll({
  invitationId,
  invitationAccess,
  paymentId,
  enabled,
  onTerminal,
}: Params) {
  const [state, setState] = useState<GiftPaymentPollState>('idle')
  const [outcome, setOutcome] = useState<GuestPaymentStatusResponse | null>(null)
  const onTerminalRef = useRef(onTerminal)
  onTerminalRef.current = onTerminal

  const pollOnce = useCallback(async () => {
    if (!paymentId) return null
    const next = await fetchPaymentStatus(invitationId, paymentId, invitationAccess)
    setOutcome(next)
    return next
  }, [invitationAccess, invitationId, paymentId])

  useEffect(() => {
    if (!enabled || !paymentId) {
      setState('idle')
      return
    }

    setState('polling')
    let cancelled = false

    const run = async () => {
      try {
        const next = await pollOnce()
        if (cancelled || !next) return
        const status = next.payment_status.toUpperCase()
        if (status === 'APPROVED') {
          setState('approved')
          onTerminalRef.current?.(next)
        } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'REFUNDED') {
          setState(status === 'CANCELLED' ? 'cancelled' : 'failed')
          onTerminalRef.current?.(next)
        }
      } catch {
        /* keep polling */
      }
    }

    void run()
    const intervalId = window.setInterval(() => {
      void run()
    }, GIFT_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [enabled, paymentId, pollOnce])

  const pix: PixDisplayPayload | null | undefined = outcome?.pix

  return {
    state,
    outcome,
    pix,
    pollOnce,
  }
}

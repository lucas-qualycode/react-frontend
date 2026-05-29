import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import { useGuestInvitationPhase } from '@/features/events/context/GuestInvitationPhaseContext'
import {
  fetchGuestPaymentStatus,
  type ActiveCheckoutResponse,
  type GuestPaymentStatusResponse,
  type PixDisplayPayload,
} from '../blocks/payment/checkoutPayload'

export type GuestPaymentPageMode =
  | 'loading'
  | 'pix_pending'
  | 'card_pending'
  | 'failed'
  | 'retry'
  | 'redirecting'
  | 'unavailable'

function resolveMode(
  status: string,
  method: string | null | undefined,
  forceRetry: boolean,
): GuestPaymentPageMode {
  const normalized = status.toUpperCase()
  if (normalized === 'APPROVED') return 'redirecting'
  if (forceRetry || normalized === 'FAILED' || normalized === 'CANCELLED') return 'retry'
  if (method === 'pix' || method === 'bank_transfer') return 'pix_pending'
  return 'card_pending'
}

function outcomeFromActive(active: ActiveCheckoutResponse): GuestPaymentStatusResponse {
  return {
    order_id: active.order_id ?? '',
    payment_id: active.payment_id ?? '',
    payment_status: active.payment_status ?? 'PENDING',
    payment_method: active.payment_method,
    next_action: active.next_action ?? 'wait',
    total_cents: active.total_cents,
    pix: active.pix,
    failure: active.failure,
  }
}

type Params = {
  eventId: string
  invitationId: string
  invitationAccess: InvitationAccess
  initialPaymentId: string | null
  activeCheckout: ActiveCheckoutResponse | null
}

export function useGuestPaymentSession({
  eventId,
  invitationId,
  invitationAccess,
  initialPaymentId,
  activeCheckout,
}: Params) {
  const { goToConfirmed } = useGuestInvitationPhase()
  const resolvedInitialPaymentId =
    initialPaymentId ?? activeCheckout?.payment_id ?? null

  const [paymentId, setPaymentId] = useState(resolvedInitialPaymentId)
  const [outcome, setOutcome] = useState<GuestPaymentStatusResponse | null>(() =>
    activeCheckout?.payment_id ? outcomeFromActive(activeCheckout) : null,
  )
  const [bootstrapComplete, setBootstrapComplete] = useState(
    () => Boolean(activeCheckout?.payment_id),
  )
  const [forceRetry, setForceRetry] = useState(false)
  const [pixExpired, setPixExpired] = useState(false)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    if (bootstrapComplete) return
    if (!paymentId) {
      setBootstrapComplete(true)
      return
    }
    if (outcome) {
      setBootstrapComplete(true)
      return
    }

    let cancelled = false
    void fetchGuestPaymentStatus(invitationId, paymentId, invitationAccess)
      .then((next) => {
        if (cancelled) return
        setOutcome(next)
        setBootstrapComplete(true)
      })
      .catch(() => {
        if (!cancelled) setBootstrapComplete(true)
      })

    return () => {
      cancelled = true
    }
  }, [bootstrapComplete, invitationAccess, invitationId, outcome, paymentId])

  const mode = useMemo((): GuestPaymentPageMode => {
    if (!bootstrapComplete) return 'loading'
    if (!paymentId || !outcome) return 'unavailable'
    if (pixExpired && outcome.payment_status.toUpperCase() === 'PENDING') return 'retry'
    return resolveMode(outcome.payment_status, outcome.payment_method, forceRetry)
  }, [bootstrapComplete, forceRetry, outcome, paymentId, pixExpired])

  const pollStatus = useCallback(async () => {
    if (!paymentId) return
    try {
      const next = await fetchGuestPaymentStatus(
        invitationId,
        paymentId,
        invitationAccess,
      )
      setOutcome(next)
      if (next.payment_status.toUpperCase() === 'APPROVED') {
        goToConfirmed()
      }
    } catch {
      /* keep last known outcome */
    }
  }, [goToConfirmed, invitationAccess, invitationId, paymentId])

  useEffect(() => {
    if (!paymentId) return
    if (mode !== 'pix_pending' && mode !== 'card_pending') return

    void pollStatus()
    pollRef.current = window.setInterval(() => {
      void pollStatus()
    }, 4000)

    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [mode, paymentId, pollStatus])

  useEffect(() => {
    const expiresAt = outcome?.pix?.expires_at
    if (!expiresAt || mode !== 'pix_pending') return

    const expiryMs = Date.parse(expiresAt)
    if (Number.isNaN(expiryMs)) return

    const tick = () => {
      if (Date.now() >= expiryMs) {
        setPixExpired(true)
        setForceRetry(true)
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [mode, outcome?.pix?.expires_at])

  const applyCheckoutResult = useCallback((result: GuestPaymentStatusResponse) => {
    setPaymentId(result.payment_id)
    setOutcome(result)
    setBootstrapComplete(true)
    setForceRetry(false)
    setPixExpired(false)
  }, [])

  const beginRetry = useCallback(() => {
    setForceRetry(true)
  }, [])

  const remainingSeconds = useMemo(() => {
    const expiresAt = outcome?.pix?.expires_at
    if (!expiresAt) return null
    const expiryMs = Date.parse(expiresAt)
    if (Number.isNaN(expiryMs)) return null
    return Math.max(0, Math.floor((expiryMs - Date.now()) / 1000))
  }, [outcome?.pix?.expires_at, mode])

  const pix: PixDisplayPayload | null | undefined = outcome?.pix

  return {
    paymentId,
    outcome,
    mode,
    pix,
    remainingSeconds,
    pollStatus,
    applyCheckoutResult,
    beginRetry,
    totalCents: outcome?.total_cents ?? activeCheckout?.total_cents ?? 0,
    failureMessage: outcome?.failure?.message ?? null,
  }
}

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import {
  resolvePendingGiftPaymentFromList,
  type GuestPaymentStatusResponse,
  type InvitationPaymentSummary,
} from '../lib/guestInvitationApi'
import { invitationPaymentsQueryKey } from './useInvitationPayments'
import { useGuestInvitationLoaderData } from './useGuestInvitationLoaderData'

type Params = {
  invitationId: string
  invitationAccess?: InvitationAccess | null
  enabled: boolean
  onResume: (paymentId: string, status: GuestPaymentStatusResponse) => void
  onComplete: () => void
}

export function useResumePendingGiftPayment({
  invitationId,
  invitationAccess,
  enabled,
  onResume,
  onComplete,
}: Params) {
  const queryClient = useQueryClient()
  const loaderData = useGuestInvitationLoaderData()
  const access = invitationAccess ?? loaderData?.invitationAccess
  const onResumeRef = useRef(onResume)
  const onCompleteRef = useRef(onComplete)
  onResumeRef.current = onResume
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!enabled || !invitationId || !access) return

    let cancelled = false

    void (async () => {
      try {
        const cached = queryClient.getQueryData<InvitationPaymentSummary[]>(
          invitationPaymentsQueryKey(invitationId, access.token),
        )
        if (!cached) return
        const status = await resolvePendingGiftPaymentFromList(
          cached,
          invitationId,
          access,
        )
        if (cancelled) return
        if (status) {
          onResumeRef.current(status.payment_id, status)
        }
      } catch {
        /* fall through to catalog */
      } finally {
        if (!cancelled) {
          onCompleteRef.current()
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [access, enabled, invitationId, queryClient])
}

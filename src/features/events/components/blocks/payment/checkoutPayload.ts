import { fetchApi } from '@/shared/api/client'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import { readApiErrorDetail } from '@/shared/api/invitationAccess'
import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import { USE_MOCK_INVITATION } from '../../invitationFlow/lib/guestInvitationMock'
import type { GuestCheckoutPayload, GuestPaymentFinalizeResult } from './types'

export type InvitationCheckoutResponse = {
  order_id: string
  payment_id: string
  payment_provider_payment_id?: string | null
  idempotent_replay?: boolean
}

export function buildGuestCheckoutPayload(
  invitationId: string,
  checkout: GuestCheckoutSnapshot,
  finalize: GuestPaymentFinalizeResult,
): GuestCheckoutPayload {
  const payment_provider = finalize.payment_provider ?? checkout.payment_provider
  if (!payment_provider) {
    throw new Error('Guest checkout payload requires payment_provider')
  }
  return {
    ...checkout,
    invitation_id: invitationId,
    payment_provider,
    provider_checkout: finalize.provider_checkout,
  }
}

export function logGuestCheckoutPayload(payload: GuestCheckoutPayload) {
  if (import.meta.env.DEV) {
    console.info('[guest-checkout]', payload)
  }
}

export async function submitGuestCheckout(
  invitationId: string,
  payload: GuestCheckoutPayload,
  options: {
    idempotencyKey: string
    invitationAccess?: InvitationAccess | null
  },
): Promise<InvitationCheckoutResponse> {
  if (USE_MOCK_INVITATION) {
    logGuestCheckoutPayload(payload)
    return {
      order_id: 'mock-order',
      payment_id: 'mock-payment',
      idempotent_replay: false,
    }
  }

  const res = await fetchApi(
    `invitations/${invitationId}/checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': options.idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
    options.invitationAccess,
  )
  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    throw new Error(detail ?? `Checkout failed (${res.status})`)
  }
  return res.json() as Promise<InvitationCheckoutResponse>
}

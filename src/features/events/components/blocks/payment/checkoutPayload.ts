import { fetchApi } from '@/shared/api/client'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import { readApiErrorDetail } from '@/shared/api/invitationAccess'
import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import { USE_MOCK_INVITATION } from '../../invitationFlow/lib/guestInvitationMock'
import type { GuestCheckoutPayload, GuestPaymentFinalizeResult } from './types'

export type PixDisplayPayload = {
  qr_code_base64?: string | null
  copy_paste_code?: string | null
  ticket_url?: string | null
  expires_at?: string | null
}

export type PaymentFailurePayload = {
  code?: string | null
  message?: string | null
}

export type PaymentNextAction = 'display_pix' | 'wait' | 'done' | 'failed'

export type PaymentOutcomeFields = {
  payment_status: string
  payment_method?: string | null
  next_action: PaymentNextAction
  total_cents?: number | null
  pix?: PixDisplayPayload | null
  failure?: PaymentFailurePayload | null
}

export type InvitationCheckoutResponse = PaymentOutcomeFields & {
  order_id: string
  payment_id: string
  payment_provider_payment_id?: string | null
  idempotent_replay?: boolean
}

export type ActiveCheckoutResponse = Omit<PaymentOutcomeFields, 'payment_status' | 'next_action'> & {
  payment_status?: string | null
  next_action?: PaymentNextAction | null
  active: boolean
  order_id?: string | null
  payment_id?: string | null
  has_approved_payment: boolean
}

export type GuestPaymentStatusResponse = PaymentOutcomeFields & {
  order_id: string
  payment_id: string
  payment_provider_payment_id?: string | null
}

export type ConfirmationOrderItemSummary = {
  product_id: string
  name?: string | null
  quantity: number
  unit_price: number
  total_price: number
}

export type ConfirmationOrderSummary = {
  id: string
  total_amount: number
  currency: string
  items: ConfirmationOrderItemSummary[]
}

export type ConfirmationPaymentSummary = {
  id: string
  status: string
  payment_method?: string | null
  amount: number
  currency: string
  created_at: string
  payment_provider_payment_id?: string | null
  order?: ConfirmationOrderSummary | null
}

export type InvitationConfirmationResponse = {
  invitation_id: string
  event_id: string
  guest_slots: Array<Record<string, unknown>>
  couple_message?: string | null
  payments: ConfirmationPaymentSummary[]
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

export async function fetchActiveCheckout(
  invitationId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<ActiveCheckoutResponse> {
  const res = await fetchApi(
    `invitations/${invitationId}/checkout/active`,
    { method: 'GET' },
    invitationAccess,
  )
  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    throw new Error(detail ?? `Failed to load checkout (${res.status})`)
  }
  return res.json() as Promise<ActiveCheckoutResponse>
}

export async function fetchGuestPaymentStatus(
  invitationId: string,
  paymentId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<GuestPaymentStatusResponse> {
  const res = await fetchApi(
    `invitations/${invitationId}/payments/${paymentId}`,
    { method: 'GET' },
    invitationAccess,
  )
  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    throw new Error(detail ?? `Failed to load payment (${res.status})`)
  }
  return res.json() as Promise<GuestPaymentStatusResponse>
}

export async function fetchInvitationConfirmation(
  invitationId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<InvitationConfirmationResponse> {
  const res = await fetchApi(
    `invitations/${invitationId}/confirmation`,
    { method: 'GET' },
    invitationAccess,
  )
  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    throw new Error(detail ?? `Failed to load confirmation (${res.status})`)
  }
  return res.json() as Promise<InvitationConfirmationResponse>
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
      payment_status: 'PENDING',
      payment_method: 'pix',
      next_action: 'display_pix',
      total_cents: payload.total_cents,
      pix: {
        qr_code_base64: null,
        copy_paste_code: 'MOCK-PIX-CODE',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
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

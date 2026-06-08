import { fetchApi } from '@/shared/api/client'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import { readApiErrorDetail } from '@/shared/api/invitationAccess'
import type { Invitation } from '@/shared/types/api'
import { USE_MOCK_INVITATION } from './guestInvitationMock'
import {
  isPendingPaymentStatus,
  resolveActivePendingPayment,
} from './resolveActivePendingPayment'
import type { SubmitGuestMessagePayload, SubmitGuestSlotsPayload } from './guestSubmitPayload'
import type { GuestCheckoutPayload } from '../../blocks/payment/types'

export type GuestInvitationErrorCode =
  | 'INSUFFICIENT_INVENTORY'
  | 'GUEST_SLOT_LIMIT_EXCEEDED'
  | 'INVITATION_EXPIRED'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'INVALID_ORDER_ITEMS'
  | 'GUEST_SLOT_DUPLICATE'
  | 'INVALID_STATUS_TRANSITION'

export class GuestInvitationApiError extends Error {
  readonly errorCode: GuestInvitationErrorCode | null

  constructor(message: string, errorCode: GuestInvitationErrorCode | null = null) {
    super(message)
    this.name = 'GuestInvitationApiError'
    this.errorCode = errorCode
  }
}

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

export type GiftCheckoutResponse = PaymentOutcomeFields & {
  order_id: string
  payment_id: string
  payment_provider_payment_id?: string | null
  idempotent_replay?: boolean
}

export type GuestPaymentStatusResponse = PaymentOutcomeFields & {
  order_id: string
  payment_id: string
  payment_provider_payment_id?: string | null
}

export type InvitationGuestUserProduct = {
  id: string
  status: string
  product_id: string
  payment_id?: string | null
  metadata: Record<string, unknown>
}

export type InvitationGuestSlotView = {
  id: string
  invitation_id: string
  first_name: string
  required_field_ids: string[]
  field_values: Record<string, string>
  attending: boolean
  status: string
  created_at: string
  updated_at: string
  user_product: InvitationGuestUserProduct | null
}

export type InvitationGuestView = {
  invitation: Invitation
  guest_slots: InvitationGuestSlotView[]
  user_products: {
    tickets: InvitationGuestUserProduct[]
    gifts: InvitationGuestUserProduct[]
  }
}

export type GuestConfirmResponse = {
  invitation_id: string
  invitation_status: string
  payment_id: string | null
  order_id: string | null
  pending_ticket_slot_ids: string[]
  wizard_step?: string | null
}

export type InvitationPaymentOrderItem = {
  id: string
  product_id: string
  product_type?: string | null
  name?: string | null
  quantity: number
  unit_price: number
  total_price: number
  guest_slot_id?: string | null
}

export type InvitationPaymentSummary = {
  id: string
  status: string
  payment_method?: string | null
  amount: number
  currency: string
  created_at: string
  order_id: string
  items?: InvitationPaymentOrderItem[]
}

export type InvitationPaymentsResponse = {
  payments: InvitationPaymentSummary[]
}

async function parseApiError(res: Response): Promise<GuestInvitationApiError> {
  try {
    const j = (await res.json()) as { error?: unknown; detail?: unknown }
    if (j.detail && typeof j.detail === 'object' && j.detail !== null) {
      const detail = j.detail as { error_code?: string; message?: string }
      const code = detail.error_code as GuestInvitationErrorCode | undefined
      const message = detail.message ?? 'Request failed'
      return new GuestInvitationApiError(message, code ?? null)
    }
    const detail = await readApiErrorDetail(
      new Response(JSON.stringify(j), { status: res.status }),
    )
    return new GuestInvitationApiError(detail ?? `Request failed (${res.status})`)
  } catch {
    return new GuestInvitationApiError(`Request failed (${res.status})`)
  }
}

export function isInvitationGuestView(data: unknown): data is InvitationGuestView {
  return (
    typeof data === 'object' &&
    data !== null &&
    'invitation' in data &&
    'guest_slots' in data &&
    'user_products' in data
  )
}

export async function fetchInvitationGuestView(
  invitationId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<InvitationGuestView> {
  if (USE_MOCK_INVITATION) {
    const { getMockInvitationGuestView } = await import('./guestInvitationMock')
    return getMockInvitationGuestView(
      invitationId.startsWith('invitation-mock-')
        ? invitationId.slice('invitation-mock-'.length)
        : 'evt-1',
    )
  }

  const res = await fetchApi(
    `invitations/${invitationId}`,
    { method: 'GET' },
    invitationAccess,
  )
  if (!res.ok) {
    throw await parseApiError(res)
  }
  const data = (await res.json()) as unknown
  if (!isInvitationGuestView(data)) {
    throw new Error('Invalid invitation response shape')
  }
  return data
}

export async function confirmGuests(
  invitationId: string,
  payload: SubmitGuestSlotsPayload,
  invitationAccess?: InvitationAccess | null,
): Promise<GuestConfirmResponse> {
  if (USE_MOCK_INVITATION) {
    return {
      invitation_id: invitationId,
      invitation_status: payload.guests.some((g) => g.attending) ? 'ACCEPTED' : 'DECLINED',
      payment_id: null,
      order_id: null,
      pending_ticket_slot_ids: [],
      wizard_step: 'gifts',
    }
  }

  const res = await fetchApi(
    `invitations/${invitationId}/guests/confirm`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    invitationAccess,
  )
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json() as Promise<GuestConfirmResponse>
}

export async function submitGiftCheckout(
  invitationId: string,
  payload: GuestCheckoutPayload,
  options: {
    idempotencyKey: string
    invitationAccess?: InvitationAccess | null
  },
): Promise<GiftCheckoutResponse> {
  if (USE_MOCK_INVITATION) {
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
    `invitations/${invitationId}/gifts/checkout`,
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
    throw await parseApiError(res)
  }
  return res.json() as Promise<GiftCheckoutResponse>
}

export async function patchInvitationMessage(
  invitationId: string,
  payload: SubmitGuestMessagePayload,
  invitationAccess?: InvitationAccess | null,
): Promise<Invitation> {
  if (USE_MOCK_INVITATION) {
    const { getMockInvitation } = await import('./guestInvitationMock')
    const inv = getMockInvitation('evt-1')
    return {
      ...inv,
      metadata: {
        ...(inv.metadata ?? {}),
        message: payload.message.trim(),
        guest_email: payload.email.trim(),
      },
    }
  }

  const res = await fetchApi(
    `invitations/${invitationId}/message`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: payload.message,
        email: payload.email,
      }),
    },
    invitationAccess,
  )
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json() as Promise<Invitation>
}

export async function fetchInvitationPayments(
  invitationId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<InvitationPaymentsResponse> {
  if (USE_MOCK_INVITATION) {
    return { payments: [] }
  }

  const res = await fetchApi(
    `invitations/${invitationId}/payments`,
    { method: 'GET' },
    invitationAccess,
  )
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json() as Promise<InvitationPaymentsResponse>
}

export async function fetchPaymentStatus(
  invitationId: string,
  paymentId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<GuestPaymentStatusResponse> {
  if (USE_MOCK_INVITATION) {
    return {
      order_id: 'mock-order',
      payment_id: paymentId,
      payment_status: 'APPROVED',
      next_action: 'done',
      total_cents: 0,
    }
  }

  const res = await fetchApi(
    `invitations/${invitationId}/payments/${paymentId}/status`,
    { method: 'GET' },
    invitationAccess,
  )
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json() as Promise<GuestPaymentStatusResponse>
}

export async function resolvePendingGiftPaymentFromList(
  payments: InvitationPaymentSummary[],
  invitationId: string,
  invitationAccess?: InvitationAccess | null,
  options?: { fetchStatus?: boolean },
): Promise<GuestPaymentStatusResponse | null> {
  if (USE_MOCK_INVITATION) {
    return null
  }

  const active = resolveActivePendingPayment(payments)
  if (!active) return null
  if (options?.fetchStatus === false) return null

  const status = await fetchPaymentStatus(invitationId, active.id, invitationAccess)
  if (!isPendingPaymentStatus(status.payment_status)) return null
  return status
}

export async function resolvePendingGiftPayment(
  invitationId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<GuestPaymentStatusResponse | null> {
  if (USE_MOCK_INVITATION) {
    return null
  }

  const { payments } = await fetchInvitationPayments(invitationId, invitationAccess)
  return resolvePendingGiftPaymentFromList(payments, invitationId, invitationAccess)
}

export { isPendingPaymentStatus, resolveActivePendingPayment } from './resolveActivePendingPayment'

export function guestInvitationErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof GuestInvitationApiError && error.errorCode) {
    const key = `events.detail.guestFlow.errors.${error.errorCode}`
    const translated = t(key)
    if (translated !== key) return translated
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return t('events.detail.guestFlow.errors.generic')
}

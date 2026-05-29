import { message } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGuestInvitationPhase } from '@/features/events/context/GuestInvitationPhaseContext'
import { EventGuestPaymentBlock } from '../blocks/payment/EventGuestPaymentBlock'
import {
  buildGuestCheckoutPayload,
  submitGuestCheckout,
  type GuestPaymentStatusResponse,
} from '../blocks/payment/checkoutPayload'
import { finalizeGuestPayment } from '../blocks/payment/finalize'
import { resolveCardPaymentInstallments } from '../blocks/mpPayment/guestMpInstallments'
import {
  createDefaultCardPaymentPersisted,
  type GuestCardPaymentPersisted,
} from '../blocks/mpPayment/guestMpPaymentDraft'
import {
  buildCardPaymentSnapshot,
  buildPixPaymentSnapshot,
  createDefaultCardPaymentSecrets,
  validateCardPaymentForm,
} from '../blocks/mpPayment/guestMpPaymentForm'
import { paymentTypeIdForGuestMethod, type GuestPaymentMethodChoice } from '../invitationFlow/lib/guestFlowDraft'
import type { GuestPaymentSnapshot } from '../blocks/payment/types'
import {
  GUEST_FLOW_DRAFT_VERSION,
  createDefaultGuestFlowDraftState,
} from '../invitationFlow/lib/guestFlowDraft'
import { loadGuestFlowDraft, saveGuestFlowDraft } from '../invitationFlow/lib/guestFlowDraftStorage'
import type { GuestCheckoutSnapshot } from '../invitationFlow/lib/guestCheckoutSession'
import type { GuestInvitationLoaderData } from '../../loaders/guestInvitationRoutes'
import { GuestInvitationBlockViewport } from '../invitationFlow/shared/GuestInvitationBlockViewport'
import { useMercadoPago } from '@/features/events/hooks/useMercadoPago'
import { useGuestPaymentSession } from './useGuestPaymentSession'

type Props = {
  loaderData: GuestInvitationLoaderData
}

function resolveCheckoutFromDraft(
  invitationId: string,
  eventId: string,
): GuestCheckoutSnapshot | null {
  const draft = loadGuestFlowDraft(invitationId, eventId)
  return draft?.checkout ?? null
}

export function GuestPaymentPageContent({ loaderData }: Props) {
  const { t } = useTranslation()
  const { paymentNavigationState } = useGuestInvitationPhase()
  const { event, eventId, invitationId, invitationAccess, activeCheckout } = loaderData
  const checkout = useMemo(
    () => resolveCheckoutFromDraft(invitationId, eventId),
    [eventId, invitationId],
  )

  const initialPaymentId =
    activeCheckout?.payment_id ??
    paymentNavigationState?.paymentId ??
    loadGuestFlowDraft(invitationId, eventId)?.pendingCheckout?.paymentId ??
    null

  const session = useGuestPaymentSession({
    eventId,
    invitationId,
    invitationAccess,
    initialPaymentId,
    activeCheckout,
  })

  const [paymentMethod, setPaymentMethod] = useState<GuestPaymentMethodChoice | null>(
    () => loadGuestFlowDraft(invitationId, eventId)?.paymentMethod ?? 'pix',
  )
  const [pixPayerEmail, setPixPayerEmail] = useState(
    () => loadGuestFlowDraft(invitationId, eventId)?.pixPayerEmail ?? '',
  )
  const [cardPayment, setCardPayment] = useState<GuestCardPaymentPersisted>(
    () => loadGuestFlowDraft(invitationId, eventId)?.cardPayment ?? createDefaultCardPaymentPersisted(),
  )
  const [cardSecrets, setCardSecrets] = useState(createDefaultCardPaymentSecrets)
  const [paymentSnapshot, setPaymentSnapshot] = useState<GuestPaymentSnapshot | null>(null)
  const [paySubmitting, setPaySubmitting] = useState(false)
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())
  const { createCardToken, canCreateCardToken } = useMercadoPago()

  const handleCopyPix = useCallback(async () => {
    const code = session.pix?.copy_paste_code
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      message.success(t('events.detail.guestPayment.copyPixSuccess'))
    } catch {
      message.error(t('events.detail.guestPayment.copyPixError'))
    }
  }, [session.pix?.copy_paste_code, t])

  const persistPendingCheckout = useCallback(
    (result: GuestPaymentStatusResponse, idempotencyKey: string) => {
      const draft = loadGuestFlowDraft(invitationId, eventId)
      const base = draft ?? {
        version: GUEST_FLOW_DRAFT_VERSION,
        ...createDefaultGuestFlowDraftState(),
        invitationId,
        eventId,
        updatedAt: new Date().toISOString(),
      }
      saveGuestFlowDraft({
        ...base,
        pendingCheckout: {
          paymentId: result.payment_id,
          orderId: result.order_id,
          idempotencyKey,
        },
        updatedAt: new Date().toISOString(),
      })
    },
    [eventId, invitationId],
  )

  const resolvePaymentSnapshot = useCallback((): GuestPaymentSnapshot | null => {
    if (paymentSnapshot) return paymentSnapshot
    if (!paymentMethod) {
      message.warning(t('events.detail.guestMpPayment.validation.chooseMethod'))
      return null
    }
    if (paymentMethod === 'pix') {
      const email = pixPayerEmail.trim()
      if (!email) {
        message.error(t('events.detail.guestMpPayment.validation.required'))
        return null
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        message.error(t('events.detail.guestMpPayment.validation.emailInvalid'))
        return null
      }
      return buildPixPaymentSnapshot({ email })
    }
    const validation = validateCardPaymentForm(
      { ...cardPayment, ...cardSecrets },
      t,
      { requirePaymentMethod: canCreateCardToken },
    )
    if (!validation.valid) {
      message.error(t('events.detail.guestMpPayment.validation.formInvalid'))
      return null
    }
    const resolvedCard = resolveCardPaymentInstallments(
      {
        ...cardPayment,
        paymentTypeId: paymentTypeIdForGuestMethod(paymentMethod) ?? 'credit_card',
      },
      [],
      checkout?.total_cents ?? 0,
    )
    return buildCardPaymentSnapshot(resolvedCard)
  }, [
    canCreateCardToken,
    cardPayment,
    cardSecrets,
    checkout?.total_cents,
    paymentMethod,
    paymentSnapshot,
    pixPayerEmail,
    t,
  ])

  const handlePay = useCallback(async () => {
    if (!checkout) {
      message.error(t('events.detail.guestPayment.missingCheckout'))
      return
    }
    const snapshot = resolvePaymentSnapshot()
    if (!snapshot) return

    idempotencyKeyRef.current = crypto.randomUUID()
    setPaySubmitting(true)
    try {
      const finalizeResult = await finalizeGuestPayment(checkout, snapshot, {
        cardSecrets,
        createCardToken: (form) => createCardToken(form),
        canCreateCardToken: canCreateCardToken,
      })
      const payload = buildGuestCheckoutPayload(invitationId, checkout, finalizeResult)
      const result = await submitGuestCheckout(invitationId, payload, {
        idempotencyKey: idempotencyKeyRef.current,
        invitationAccess,
      })
      persistPendingCheckout(result, idempotencyKeyRef.current)
      session.applyCheckoutResult(result)
    } catch (error) {
      const detail = error instanceof Error ? error.message : ''
      message.error(detail || t('events.detail.guestReview.checkoutError'))
    } finally {
      setPaySubmitting(false)
    }
  }, [
    canCreateCardToken,
    cardSecrets,
    checkout,
    createCardToken,
    invitationAccess,
    invitationId,
    persistPendingCheckout,
    resolvePaymentSnapshot,
    session,
    t,
  ])

  return (
    <GuestInvitationBlockViewport>
      <EventGuestPaymentBlock
        event={event}
        variant="wedding"
        checkout={checkout}
        mode={session.mode}
        pix={session.pix}
        remainingSeconds={session.remainingSeconds}
        totalCents={session.totalCents}
        failureMessage={session.failureMessage}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        pixPayerEmail={pixPayerEmail}
        onPixPayerEmailChange={setPixPayerEmail}
        cardPayment={cardPayment}
        onCardPaymentChange={setCardPayment}
        cardSecrets={cardSecrets}
        onCardSecretsChange={setCardSecrets}
        onPaymentComplete={setPaymentSnapshot}
        onCopyPix={() => void handleCopyPix()}
        onPayAgain={() => void handlePay()}
        paySubmitting={paySubmitting}
      />
    </GuestInvitationBlockViewport>
  )
}

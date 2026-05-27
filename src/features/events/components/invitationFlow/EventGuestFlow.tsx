import { Flex, Spin, Typography, message } from 'antd'
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { EventGuestConfirmBlock } from '../blocks/confirm/EventGuestConfirmBlock'
import { EventGuestGiftBlock } from '../blocks/gift/EventGuestGiftBlock'
import { EventGuestMessageBlock } from '../blocks/message/EventGuestMessageBlock'
import { getDefaultGuestPaymentProvider } from '../blocks/payment/registry'
import {
  buildGuestCheckoutPayload,
  submitGuestCheckout,
} from '../blocks/payment/checkoutPayload'
import { finalizeGuestPayment } from '../blocks/payment/finalize'
import type { GuestPaymentSnapshot } from '../blocks/payment/types'
import { EventGuestReviewBlock } from '../blocks/review/EventGuestReviewBlock'
import { EventGuestBackgroundBlock } from '../blocks/background/EventGuestBackgroundBlock'
import { EventGuestWelcomeBlock } from '../blocks/welcome/EventGuestWelcomeBlock'
import {
  refreshGuestCheckoutWithAttendingTickets,
  type GuestCheckoutSnapshot,
} from './lib/guestCheckoutSession'
import { createDefaultGuestFlowDraftState } from './lib/guestFlowDraft'
import { loadGuestFlowDraft, mergeGuestSlotsWithDraft } from './lib/guestFlowDraftStorage'
import {
  buildGuestFlowProgressCompletion,
  guestFlowProgressActiveIndex,
  guestFlowProgressNavigationTarget,
  guestFlowShowsProgressIndicator,
  type GuestFlowProgressStep,
} from './lib/guestFlowProgress'
import {
  validateLeaveGuestFlowStep,
  type LeaveStepValidationFailure,
} from './lib/guestFlowLeaveStepValidation'
import type { GuestSlotValidationResult } from './lib/guestConfirmMock'
import type { CardFormValidation } from '../blocks/mpPayment/guestMpPaymentForm'
import { createDefaultCardPaymentSecrets } from '../blocks/mpPayment/guestMpPaymentForm'
import {
  buildInitialGuestConfirmSlots,
  markAllGuestsNotAttending,
  type GuestConfirmFormSlot,
} from './lib/guestConfirmMock'
import {
  buildGuestMessageSubmitPayload,
  buildGuestSlotsSubmitPayload,
  fingerprintGuestSlotsSubmitPayload,
  guestMessageUnchanged,
  guestSlotsSubmitUnchanged,
} from './lib/guestSubmitPayload'
import {
  persistGuestMessageInBackground,
  persistGuestSlotsInBackground,
} from './lib/guestSubmitPersistence'
import { readGuestMessageFromInvitation } from './lib/guestFlowRsvpHydration'
import { useMercadoPago } from '@/features/events/hooks/useMercadoPago'
import { GuestFlowStepIndicator } from './shared/GuestFlowStepIndicator'
import { guestFlowStepUsesContentPanel } from './shared/guestPanelLayout'
import { useGuestFlowDraft, type GuestFlowHydrationPayload } from './hooks/useGuestFlowDraft'
import {
  GUEST_FLOW_STEP_INDEX,
  type EventGuestBackgroundVariant,
  type EventGuestConfirmVariant,
  type EventGuestFlowStep,
  type EventGuestGiftVariant,
  type EventGuestMessageVariant,
  type EventGuestMpPaymentVariant,
  type EventGuestReviewVariant,
  type EventGuestWelcomeVariant,
} from './types'
import { useInvitationAccess } from '@/shared/api/InvitationAccessContext'
import { useGuestInvitation } from './hooks/useGuestInvitation'
import './eventGuestFlow.css'

const { Text } = Typography

type Props = {
  event: Event
  invitationId?: string
  backgroundVariant: EventGuestBackgroundVariant
  welcomeVariant: EventGuestWelcomeVariant
  confirmVariant: EventGuestConfirmVariant
  giftVariant: EventGuestGiftVariant
  mpPaymentVariant: EventGuestMpPaymentVariant
  messageVariant: EventGuestMessageVariant
  reviewVariant: EventGuestReviewVariant
}

const TRANSITION_MS = 500

type SlideTransition = {
  from: EventGuestFlowStep
  to: EventGuestFlowStep
  progress: number
}

function isForwardTransition(from: EventGuestFlowStep, to: EventGuestFlowStep) {
  return GUEST_FLOW_STEP_INDEX[to] > GUEST_FLOW_STEP_INDEX[from]
}

function panelsDuringTransition(transition: SlideTransition): EventGuestFlowStep[] {
  return isForwardTransition(transition.from, transition.to)
    ? [transition.from, transition.to]
    : [transition.to, transition.from]
}

function trackOffsetForTransition(transition: SlideTransition, slideWidth: number) {
  const forward = isForwardTransition(transition.from, transition.to)
  return forward ? -transition.progress * slideWidth : -(1 - transition.progress) * slideWidth
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

export function EventGuestFlow({
  event,
  invitationId,
  backgroundVariant,
  welcomeVariant,
  confirmVariant,
  giftVariant,
  mpPaymentVariant,
  messageVariant,
  reviewVariant,
}: Props) {
  const { t } = useTranslation()
  const invitationAccess = useInvitationAccess()
  const guestInvitation = useGuestInvitation(event.id, invitationId)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const animatingRef = useRef(false)
  const activeStepRef = useRef<EventGuestFlowStep>('welcome')
  const transitionRef = useRef<SlideTransition | null>(null)

  const defaultDraftState = createDefaultGuestFlowDraftState()

  const [activeStep, setActiveStep] = useState<EventGuestFlowStep>('welcome')
  const [transition, setTransition] = useState<SlideTransition | null>(null)
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)
  const [slideWidth, setSlideWidth] = useState(0)
  const [trackOffsetX, setTrackOffsetX] = useState(0)
  const [draftHydrated, setDraftHydrated] = useState(false)

  const [flowPath, setFlowPath] = useState(defaultDraftState.flowPath)
  const [guestSlots, setGuestSlots] = useState<GuestConfirmFormSlot[]>(defaultDraftState.guestSlots)
  const [confirmPhase, setConfirmPhase] = useState(defaultDraftState.confirmPhase)
  const [confirmGuestIndex, setConfirmGuestIndex] = useState(defaultDraftState.confirmGuestIndex)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    defaultDraftState.selectedProductIds,
  )
  const [giftPhase, setGiftPhase] = useState(defaultDraftState.giftPhase)
  const [giftPage, setGiftPage] = useState(defaultDraftState.giftPage)
  const [checkout, setCheckout] = useState<GuestCheckoutSnapshot | null>(defaultDraftState.checkout)
  const [coupleMessage, setCoupleMessage] = useState(defaultDraftState.coupleMessage)
  const [paymentMethod, setPaymentMethod] = useState(defaultDraftState.paymentMethod)
  const [pixPayerEmail, setPixPayerEmail] = useState(defaultDraftState.pixPayerEmail)
  const [cardPayment, setCardPayment] = useState(defaultDraftState.cardPayment)
  const [cardSecrets, setCardSecrets] = useState(createDefaultCardPaymentSecrets)
  const [paymentSnapshot, setPaymentSnapshot] = useState<GuestPaymentSnapshot | null>(null)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const checkoutIdempotencyKeyRef = useRef<string | null>(null)
  const [guestsSaved, setGuestsSaved] = useState(defaultDraftState.guestsSaved ?? false)
  const [messageSaved, setMessageSaved] = useState(defaultDraftState.messageSaved ?? false)
  const [lastSavedGuestsFingerprint, setLastSavedGuestsFingerprint] = useState<string | null>(
    defaultDraftState.lastSavedGuestsFingerprint ?? null,
  )
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(
    defaultDraftState.lastSavedMessage ?? null,
  )
  const [maxProgressIndexReached, setMaxProgressIndexReached] = useState(0)
  const [confirmValidationHighlight, setConfirmValidationHighlight] =
    useState<GuestSlotValidationResult | null>(null)
  const [confirmValidationGuestIndex, setConfirmValidationGuestIndex] = useState<number | undefined>(
    undefined,
  )
  const [paymentNavigationFieldErrors, setPaymentNavigationFieldErrors] = useState<
    CardFormValidation['fieldErrors'] | undefined
  >(undefined)
  const guestPaymentProvider = useMemo(() => getDefaultGuestPaymentProvider(), [])
  const PaymentBlock = guestPaymentProvider.PaymentBlock
  const {
    isConfigured: isMpConfigured,
    isReady: isMpReady,
    canCreateCardToken: canCreateMpCardToken,
    createCardToken,
  } = useMercadoPago()

  const invitationReady =
    !guestInvitation.isLoading &&
    !guestInvitation.isError &&
    Boolean(guestInvitation.invitation) &&
    Boolean(guestInvitation.ticket)

  const draftState = useMemo(
    () => ({
      flowPath,
      activeStep,
      guestSlots,
      confirmPhase,
      confirmGuestIndex,
      selectedProductIds,
      giftPhase,
      giftPage,
      checkout,
      coupleMessage,
      paymentMethod,
      pixPayerEmail,
      cardPayment,
      guestsSaved,
      messageSaved,
      lastSavedGuestsFingerprint,
      lastSavedMessage,
    }),
    [
      flowPath,
      activeStep,
      guestSlots,
      confirmPhase,
      confirmGuestIndex,
      selectedProductIds,
      giftPhase,
      giftPage,
      checkout,
      coupleMessage,
      paymentMethod,
      pixPayerEmail,
      cardPayment,
      guestsSaved,
      messageSaved,
      lastSavedGuestsFingerprint,
      lastSavedMessage,
    ],
  )

  const handleHydrate = useCallback((payload: GuestFlowHydrationPayload) => {
    setFlowPath(payload.flowPath)
    setActiveStep(payload.activeStep)
    activeStepRef.current = payload.activeStep
    setGuestSlots(payload.guestSlots)
    setConfirmPhase(payload.confirmPhase)
    setConfirmGuestIndex(payload.confirmGuestIndex)
    setSelectedProductIds(payload.selectedProductIds)
    setGiftPhase(payload.giftPhase)
    setGiftPage(payload.giftPage)
    setCheckout(payload.checkout)
    setCoupleMessage(payload.coupleMessage)
    setPaymentMethod(payload.paymentMethod)
    setPixPayerEmail(payload.pixPayerEmail)
    setCardPayment(payload.cardPayment)
    setCardSecrets(createDefaultCardPaymentSecrets())
    setPaymentSnapshot(null)
    setGuestsSaved(payload.guestsSaved ?? false)
    setMessageSaved(payload.messageSaved ?? false)
    setLastSavedGuestsFingerprint(payload.lastSavedGuestsFingerprint ?? null)
    setLastSavedMessage(payload.lastSavedMessage ?? null)
    const progressIdx = guestFlowProgressActiveIndex(payload.activeStep)
    setMaxProgressIndexReached(progressIdx >= 0 ? progressIdx : 0)
  }, [])

  const { clearDraft } = useGuestFlowDraft({
    invitationId,
    eventId: event.id,
    invitation: guestInvitation.invitation,
    ticket: guestInvitation.ticket,
    isReady: invitationReady,
    state: draftState,
    draftHydrated,
    onHydrate: handleHydrate,
    onDraftHydrated: () => setDraftHydrated(true),
  })

  useLayoutEffect(() => {
    const invitation = guestInvitation.invitation
    const ticket = guestInvitation.ticket
    if (!draftHydrated || !invitationReady || !invitation || !ticket || guestSlots.length > 0) return
    setGuestSlots(buildInitialGuestConfirmSlots(invitation, ticket))
  }, [
    draftHydrated,
    guestInvitation.invitation,
    guestInvitation.ticket,
    guestSlots.length,
    invitationReady,
  ])

  const handleConfirmReviewBackToForm = useCallback(() => {
    const invitation = guestInvitation.invitation
    const ticket = guestInvitation.ticket
    if (!invitation || !ticket) return

    const draftKey = invitationId ?? invitation.id
    const stored = loadGuestFlowDraft(draftKey, event.id)
    if (stored?.guestSlots?.length) {
      const initial = buildInitialGuestConfirmSlots(invitation, ticket)
      setGuestSlots(mergeGuestSlotsWithDraft(initial, stored.guestSlots))
    }

    setConfirmPhase('form')
    setConfirmGuestIndex(0)
  }, [event.id, guestInvitation.invitation, guestInvitation.ticket, invitationId])

  activeStepRef.current = activeStep
  transitionRef.current = transition

  const progressDisplayStep = transition ? transition.to : activeStep
  const showProgressIndicator = guestFlowShowsProgressIndicator(progressDisplayStep)

  const progressCompletion = useMemo(
    () =>
      buildGuestFlowProgressCompletion({
        guestsSaved,
        confirmPhase,
        lastSavedGuestsFingerprint,
        checkout,
        paymentSnapshot: paymentSnapshot !== null,
        messageSaved,
        maxProgressIndexReached,
      }),
    [
      guestsSaved,
      confirmPhase,
      lastSavedGuestsFingerprint,
      checkout,
      paymentSnapshot,
      messageSaved,
      maxProgressIndexReached,
    ],
  )

  const syncViewportHeight = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const stepsHeight = stepsRef.current?.offsetHeight ?? 0
    const measured = track.offsetHeight + stepsHeight
    if (measured > 0) setViewportHeight(measured)
  }, [])

  const applySlideLayout = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const width = viewport.clientWidth
    if (width <= 0) return

    setSlideWidth(width)

    const currentTransition = transitionRef.current
    if (currentTransition && animatingRef.current) {
      setTrackOffsetX(trackOffsetForTransition(currentTransition, width))
    } else {
      setTrackOffsetX(0)
    }

    syncViewportHeight()
  }, [syncViewportHeight])

  useLayoutEffect(() => {
    applySlideLayout()
  }, [activeStep, transition, showProgressIndicator, applySlideLayout, event.id, event.name, event.description])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport) return

    const observer = new ResizeObserver(() => {
      applySlideLayout()
    })
    observer.observe(viewport)
    if (track) observer.observe(track)
    const steps = stepsRef.current
    if (steps) observer.observe(steps)

    return () => observer.disconnect()
  }, [applySlideLayout, activeStep, transition, showProgressIndicator])

  const animateTo = useCallback(
    (target: EventGuestFlowStep) => {
      if (activeStep === target || animatingRef.current) return

      const width = viewportRef.current?.clientWidth ?? slideWidth
      const from = activeStep

      if (width <= 0) {
        setActiveStep(target)
        activeStepRef.current = target
        setTransition(null)
        transitionRef.current = null
        setTrackOffsetX(0)
        syncViewportHeight()
        return
      }

      const forward = isForwardTransition(from, target)
      const initial: SlideTransition = { from, to: target, progress: 0 }
      transitionRef.current = initial
      setTransition(initial)
      setTrackOffsetX(forward ? 0 : -width)
      animatingRef.current = true
      syncViewportHeight()

      const startedAt = performance.now()

      const tick = (now: number) => {
        const raw = Math.min(1, (now - startedAt) / TRANSITION_MS)
        const progress = easeOutCubic(raw)
        const currentWidth = viewportRef.current?.clientWidth ?? width
        const next: SlideTransition = { from, to: target, progress }
        transitionRef.current = next
        setTransition(next)
        setTrackOffsetX(trackOffsetForTransition(next, currentWidth))

        if (raw < 1) {
          frameRef.current = requestAnimationFrame(tick)
          return
        }

        animatingRef.current = false
        setActiveStep(target)
        activeStepRef.current = target
        const progressIdx = guestFlowProgressActiveIndex(target)
        if (progressIdx >= 0) {
          setMaxProgressIndexReached((prev) => Math.max(prev, progressIdx))
        }
        setTransition(null)
        transitionRef.current = null
        setTrackOffsetX(0)
        setSlideWidth(currentWidth)
        syncViewportHeight()
      }

      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(tick)
    },
    [activeStep, slideWidth, syncViewportHeight],
  )

  const handleCannotAttend = useCallback(() => {
    const invitation = guestInvitation.invitation
    const ticket = guestInvitation.ticket
    if (!invitation || !ticket) return

    const baseSlots =
      guestSlots.length > 0
        ? guestSlots
        : buildInitialGuestConfirmSlots(invitation, ticket)
    const declinedSlots = markAllGuestsNotAttending(baseSlots)

    setFlowPath('decline')
    setGuestSlots(declinedSlots)
    setConfirmPhase('review')
    setConfirmGuestIndex(Math.max(0, declinedSlots.length - 1))
    setConfirmValidationHighlight(null)
    setConfirmValidationGuestIndex(undefined)
    animateTo('confirm')
  }, [animateTo, guestInvitation.invitation, guestInvitation.ticket, guestSlots])

  useLayoutEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const handleAttendanceConfirmed = useCallback(() => {
    animateTo('gift')

    const resolvedInvitationId = invitationId ?? guestInvitation.invitation?.id
    const ticket = guestInvitation.ticket
    if (!resolvedInvitationId || !ticket) return

    const payload = buildGuestSlotsSubmitPayload(guestSlots)
    const fingerprint = fingerprintGuestSlotsSubmitPayload(payload)
    if (guestSlotsSubmitUnchanged(payload, lastSavedGuestsFingerprint)) return

    persistGuestSlotsInBackground(
      resolvedInvitationId,
      payload,
      (invitation) => {
        setGuestsSaved(true)
        setLastSavedGuestsFingerprint(fingerprint)
        setGuestSlots(buildInitialGuestConfirmSlots(invitation, ticket))
      },
      t('events.detail.guestFlow.saveGuestsFailed'),
      invitationAccess,
    )
  }, [
    animateTo,
    guestInvitation.invitation,
    guestInvitation.ticket,
    guestSlots,
    invitationId,
    invitationAccess,
    lastSavedGuestsFingerprint,
    t,
  ])

  const handleGiftsConfirmed = useCallback(
    (snapshot: GuestCheckoutSnapshot) => {
      setCheckout(snapshot)
      setPaymentSnapshot(null)
      if (snapshot.total_cents > 0) {
        animateTo('mp_payment')
        return
      }
      animateTo('message')
    },
    [animateTo],
  )

  const handlePaymentComplete = useCallback(
    (snapshot: GuestPaymentSnapshot) => {
      setPaymentSnapshot(snapshot)
      if (snapshot.method === 'card') {
        setCardPayment(snapshot.card)
      }
      setCheckout((prev) =>
        prev ? { ...prev, payment_provider: snapshot.payment_provider } : prev,
      )
      animateTo('message')
    },
    [animateTo],
  )

  const handleMessageContinue = useCallback(() => {
    animateTo('review')

    const resolvedInvitationId = invitationId ?? guestInvitation.invitation?.id
    if (!resolvedInvitationId) return

    const trimmed = coupleMessage.trim()
    if (guestMessageUnchanged(trimmed, lastSavedMessage)) return

    persistGuestMessageInBackground(
      resolvedInvitationId,
      buildGuestMessageSubmitPayload(trimmed),
      (invitation) => {
        setMessageSaved(true)
        setLastSavedMessage(trimmed)
        const fromServer = readGuestMessageFromInvitation(invitation)
        if (fromServer) {
          setCoupleMessage(fromServer)
        }
      },
      t('events.detail.guestFlow.saveMessageFailed'),
      invitationAccess,
    )
  }, [
    animateTo,
    coupleMessage,
    guestInvitation.invitation,
    invitationId,
    invitationAccess,
    lastSavedMessage,
    t,
  ])

  const handleReviewEditGuests = useCallback(() => {
    setConfirmPhase('form')
    setConfirmGuestIndex(0)
    animateTo('confirm')
  }, [animateTo])

  const handleReviewEditGifts = useCallback(() => {
    setGiftPhase('browse')
    animateTo('gift')
  }, [animateTo])

  const handleReviewEditPayment = useCallback(() => {
    animateTo('mp_payment')
  }, [animateTo])

  const handleReviewEditMessage = useCallback(() => {
    animateTo('message')
  }, [animateTo])

  const applyLeaveStepValidationFailure = useCallback((failure: LeaveStepValidationFailure) => {
    if (failure.step === 'confirm') {
      setConfirmValidationHighlight(failure.validation)
      setConfirmValidationGuestIndex(failure.guestIndex)
      if (confirmPhase !== 'form') {
        setConfirmPhase('form')
      }
      return
    }
    if (failure.step === 'mp_payment') {
      setPaymentNavigationFieldErrors(failure.fieldErrors)
    }
  }, [confirmPhase])

  const tryLeaveCurrentStepForNavigation = useCallback(
    (targetStep: EventGuestFlowStep): boolean => {
      const leaveResult = validateLeaveGuestFlowStep({
        activeStep,
        targetStep,
        slots: guestSlots,
        confirmPhase,
        confirmGuestIndex,
        fieldDefinitions: guestInvitation.fieldDefinitions ?? [],
        checkout,
        paymentMethod,
        pixPayerEmail,
        cardPaymentForm: { ...cardPayment, ...cardSecrets },
        mercadoPagoLeaveDeps: { isConfigured: isMpConfigured, isReady: isMpReady },
        t,
      })
      if (leaveResult.ok) {
        setConfirmValidationHighlight(null)
        setConfirmValidationGuestIndex(undefined)
        setPaymentNavigationFieldErrors(undefined)
        return true
      }
      applyLeaveStepValidationFailure(leaveResult)
      return false
    },
    [
      activeStep,
      applyLeaveStepValidationFailure,
      cardPayment,
      cardSecrets,
      checkout,
      confirmGuestIndex,
      confirmPhase,
      guestInvitation.fieldDefinitions,
      guestSlots,
      isMpConfigured,
      isMpReady,
      paymentMethod,
      pixPayerEmail,
      t,
    ],
  )

  const handleProgressWelcomeClick = useCallback(() => {
    if (!tryLeaveCurrentStepForNavigation('welcome')) return
    animateTo('welcome')
  }, [animateTo, tryLeaveCurrentStepForNavigation])

  const handleProgressStepClick = useCallback(
    (progressStep: GuestFlowProgressStep) => {
      const target = guestFlowProgressNavigationTarget(progressStep, checkout)
      if (!tryLeaveCurrentStepForNavigation(target)) return

      if (progressStep === 'confirm') {
        setConfirmPhase('review')
      } else if (progressStep === 'gift') {
        setGiftPhase('review')
      }

      animateTo(target)
    },
    [animateTo, checkout, tryLeaveCurrentStepForNavigation],
  )

  const handleMessageBack = useCallback(() => {
    if (checkout && checkout.total_cents > 0) {
      animateTo('mp_payment')
      return
    }
    animateTo('gift')
  }, [animateTo, checkout])

  const handleFinalConfirm = useCallback(async () => {
    if (!checkout) {
      clearDraft()
      return
    }

    const resolvedInvitationId = invitationId ?? guestInvitation.invitation?.id
    if (!resolvedInvitationId) {
      message.error(t('events.detail.guestReview.paymentPending'))
      return
    }

    const ticket = guestInvitation.ticket
    const resolvedCheckout =
      ticket && guestSlots.length > 0
        ? refreshGuestCheckoutWithAttendingTickets(checkout, ticket, guestSlots)
        : checkout

    if (resolvedCheckout.total_cents <= 0) {
      clearDraft()
      return
    }

    if (!paymentSnapshot) {
      message.error(t('events.detail.guestReview.paymentPending'))
      return
    }

    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current = crypto.randomUUID()
    }

    setCheckoutSubmitting(true)
    try {
      const finalizeResult = await finalizeGuestPayment(resolvedCheckout, paymentSnapshot, {
        cardSecrets,
        createCardToken: (form) => createCardToken(form),
        canCreateCardToken: canCreateMpCardToken,
      })

      const payload = buildGuestCheckoutPayload(
        resolvedInvitationId,
        resolvedCheckout,
        finalizeResult,
      )

      await submitGuestCheckout(resolvedInvitationId, payload, {
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        invitationAccess,
      })

      checkoutIdempotencyKeyRef.current = null
      message.success(t('events.detail.guestReview.checkoutSuccess'))
      clearDraft()
      setCardSecrets(createDefaultCardPaymentSecrets())
      setPaymentSnapshot(null)
    } catch (error) {
      console.error('[guest-checkout] checkout error', error)
      const detail = error instanceof Error ? error.message : ''
      if (detail) {
        message.error(detail)
      } else {
        message.error(t('events.detail.guestReview.checkoutError'))
      }
    } finally {
      setCheckoutSubmitting(false)
    }
  }, [
    cardSecrets,
    checkout,
    clearDraft,
    canCreateMpCardToken,
    createCardToken,
    guestInvitation.invitation,
    guestInvitation.ticket,
    guestSlots,
    invitationAccess,
    invitationId,
    paymentSnapshot,
    t,
  ])

  const visibleSteps = transition ? panelsDuringTransition(transition) : [activeStep]

  const usesContentPanelLayout =
    guestFlowStepUsesContentPanel(activeStep) ||
    (transition !== null &&
      (guestFlowStepUsesContentPanel(transition.from) ||
        guestFlowStepUsesContentPanel(transition.to)))

  const viewportStyle = {
    ...(viewportHeight !== undefined
      ? { height: viewportHeight, minHeight: viewportHeight }
      : {}),
    ...(slideWidth > 0
      ? ({ '--guest-flow-slide-width': `${slideWidth}px` } as CSSProperties)
      : {}),
  }

  const renderStep = (flowStep: EventGuestFlowStep) => {
    switch (flowStep) {
      case 'welcome':
        return (
          <EventGuestWelcomeBlock
            event={event}
            variant={welcomeVariant}
            onCannotAttend={handleCannotAttend}
            onConfirmAttendance={() => {
              setFlowPath('attend')
              if (
                guestInvitation.invitation &&
                guestInvitation.ticket &&
                guestSlots.length === 0
              ) {
                setGuestSlots(
                  buildInitialGuestConfirmSlots(
                    guestInvitation.invitation,
                    guestInvitation.ticket,
                  ),
                )
              }
              animateTo('confirm')
            }}
          />
        )
      case 'confirm':
        if (!guestInvitation.invitation || !guestInvitation.ticket || guestSlots.length === 0) {
          return null
        }
        return (
          <EventGuestConfirmBlock
            key={guestInvitation.invitation.id}
            event={event}
            variant={confirmVariant}
            invitation={guestInvitation.invitation}
            ticket={guestInvitation.ticket}
            fieldDefinitions={guestInvitation.fieldDefinitions}
            slots={guestSlots}
            onSlotsChange={(next) => {
              setConfirmValidationHighlight(null)
              setConfirmValidationGuestIndex(undefined)
              setGuestSlots(next)
            }}
            phase={confirmPhase}
            onPhaseChange={setConfirmPhase}
            currentIndex={confirmGuestIndex}
            onCurrentIndexChange={setConfirmGuestIndex}
            onBack={() => animateTo('welcome')}
            onReviewBackToForm={handleConfirmReviewBackToForm}
            onAttendanceConfirmed={handleAttendanceConfirmed}
            validationHighlight={confirmValidationHighlight}
            validationHighlightGuestIndex={confirmValidationGuestIndex}
            onValidationHighlightClear={() => {
              setConfirmValidationHighlight(null)
              setConfirmValidationGuestIndex(undefined)
            }}
          />
        )
      case 'gift':
        return (
          <EventGuestGiftBlock
            event={event}
            invitationId={invitationId}
            variant={giftVariant}
            ticket={guestInvitation.ticket}
            guestSlots={guestSlots}
            selectedProductIds={selectedProductIds}
            onSelectedProductIdsChange={setSelectedProductIds}
            phase={giftPhase}
            onPhaseChange={setGiftPhase}
            page={giftPage}
            onPageChange={setGiftPage}
            onBack={() => animateTo('confirm')}
            onGiftsConfirmed={handleGiftsConfirmed}
          />
        )
      case 'mp_payment':
        if (!checkout) return null
        return (
          <PaymentBlock
            event={event}
            variant={mpPaymentVariant}
            checkout={checkout}
            method={paymentMethod}
            onMethodChange={setPaymentMethod}
            pixPayerEmail={pixPayerEmail}
            onPixPayerEmailChange={setPixPayerEmail}
            cardPayment={cardPayment}
            onCardPaymentChange={setCardPayment}
            cardSecrets={cardSecrets}
            onCardSecretsChange={setCardSecrets}
            onPaymentComplete={handlePaymentComplete}
            onBack={() => animateTo('gift')}
            navigationFieldErrors={paymentNavigationFieldErrors}
            onNavigationFieldErrorsClear={() => setPaymentNavigationFieldErrors(undefined)}
          />
        )
      case 'message':
        return (
          <EventGuestMessageBlock
            event={event}
            variant={messageVariant}
            message={coupleMessage}
            onMessageChange={setCoupleMessage}
            onBack={handleMessageBack}
            onContinue={handleMessageContinue}
          />
        )
      case 'review':
        return (
          <EventGuestReviewBlock
            event={event}
            invitationId={invitationId}
            variant={reviewVariant}
            guestSlots={guestSlots}
            checkout={checkout}
            paymentSnapshot={paymentSnapshot}
            cardPayment={cardPayment}
            coupleMessage={coupleMessage}
            fieldDefinitions={guestInvitation.fieldDefinitions}
            onEdit={() => animateTo('welcome')}
            onEditGuests={handleReviewEditGuests}
            onEditGifts={handleReviewEditGifts}
            onEditPayment={
              checkout && checkout.total_cents > 0 ? handleReviewEditPayment : undefined
            }
            onEditMessage={handleReviewEditMessage}
            onConfirm={handleFinalConfirm}
            confirmLoading={checkoutSubmitting}
          />
        )
    }
  }

  if (guestInvitation.isLoading || (invitationReady && !draftHydrated)) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
        <Spin size="large" />
      </Flex>
    )
  }

  if (guestInvitation.isError) {
    return (
      <Flex vertical align="center" justify="center" gap={8} style={{ minHeight: 260, width: '100%', padding: 24 }}>
        <Text type="danger">{t('events.detail.guestFlow.invitationLoadError')}</Text>
      </Flex>
    )
  }

  return (
    <div
      ref={viewportRef}
      className={`guest-flow-viewport${usesContentPanelLayout ? ' guest-flow-viewport--content-panel' : ''}${showProgressIndicator ? ' guest-flow-viewport--with-steps' : ''}`}
      style={viewportStyle}
    >
      <EventGuestBackgroundBlock variant={backgroundVariant} />
      {showProgressIndicator ? (
        <div ref={stepsRef}>
          <GuestFlowStepIndicator
            activeStep={progressDisplayStep}
            checkout={checkout}
            completion={progressCompletion}
            onWelcomeClick={handleProgressWelcomeClick}
            onStepClick={handleProgressStepClick}
          />
        </div>
      ) : null}
      <div
        ref={trackRef}
        className="guest-flow-track"
        style={{ transform: `translate3d(${trackOffsetX}px, 0, 0)` }}
      >
        {visibleSteps.map((flowStep) => (
          <div key={flowStep} className="guest-flow-slot">
            {renderStep(flowStep)}
          </div>
        ))}
      </div>
    </div>
  )
}

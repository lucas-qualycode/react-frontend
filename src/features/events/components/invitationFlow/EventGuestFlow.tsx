import { Alert, Button, Flex, Spin, Typography, message } from 'antd'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useGuestInvitationLoaderData } from './hooks/useGuestInvitationLoaderData'
import type { Event } from '@/shared/types/api'
import { EventGuestConfirmBlock } from '../blocks/confirm/EventGuestConfirmBlock'
import { EventGuestFinishedBlock } from '../blocks/finished/EventGuestFinishedBlock'
import { EventGuestGiftBlock } from '../blocks/gift/EventGuestGiftBlock'
import { EventGuestMessageBlock } from '../blocks/message/EventGuestMessageBlock'
import { getDefaultGuestPaymentProvider } from '../blocks/payment/registry'
import { buildGuestCheckoutPayload } from '../blocks/payment/checkoutPayload'
import { finalizeGuestPayment } from '../blocks/payment/finalize'
import type { GuestPaymentSnapshot } from '../blocks/payment/types'
import { EventGuestBackgroundBlock } from '../blocks/background/EventGuestBackgroundBlock'
import { EventGuestWelcomeBlock } from '../blocks/welcome/EventGuestWelcomeBlock'
import {
  giftOnlyCheckoutSnapshot,
  type GuestCheckoutSnapshot,
} from './lib/guestCheckoutSession'
import { createDefaultGuestFlowDraftState } from './lib/guestFlowDraft'
import { loadGuestFlowDraft, mergeGuestSlotsWithDraft } from './lib/guestFlowDraftStorage'
import {
  buildGuestFlowProgressCompletion,
  guestFlowProgressActiveIndex,
  guestFlowShowsProgressIndicator,
} from './lib/guestFlowProgress'
import type { GuestSlotValidationResult } from './lib/guestConfirmMock'
import type { CardFormValidation } from '../blocks/mpPayment/guestMpPaymentForm'
import { createDefaultCardPaymentSecrets } from '../blocks/mpPayment/guestMpPaymentForm'
import {
  buildInitialGuestConfirmSlots,
  markAllGuestsNotAttending,
  type GuestConfirmFormSlot,
} from './lib/guestConfirmMock'
import { buildGuestMessageSubmitPayload, buildGuestSlotsSubmitPayload, fingerprintGuestMessagePayload, fingerprintGuestSlotsSubmitPayload } from './lib/guestSubmitPayload'
import { readGuestEmailFromInvitation, readGuestMessageFromInvitation } from './lib/guestFlowRsvpHydration'
import {
  isValidGuestEmail,
  resolveGiftCapturedEmailFromSnapshot,
  resolveSubmitGuestEmail,
  showGuestMessageEmailInvalidError,
  showGuestMessageEmailValidationError,
} from './lib/guestMessageEmail'
import {
  confirmGuests,
  guestInvitationErrorMessage,
  patchInvitationMessage,
  submitGiftCheckout,
  type GiftCheckoutResponse,
  type GuestPaymentStatusResponse,
} from './lib/guestInvitationApi'
import { mergeInvitationGuestSlots } from './lib/invitationGuestSlots'
import { flowStepFromWizardStep } from './lib/resolveWizardStep'
import { formatPixExpiryCountdown } from './lib/formatPixExpiryCountdown'
import { useMercadoPago } from '@/features/events/hooks/useMercadoPago'
import { GuestFlowStepIndicator } from './shared/GuestFlowStepIndicator'
import { GuestFlowContentPanel } from './shared/GuestFlowContentPanel'
import { guestFlowStepUsesContentPanel } from './shared/guestPanelLayout'
import { useGuestFlowDraft, type GuestFlowHydrationPayload } from './hooks/useGuestFlowDraft'
import { useTicketFulfillmentPoll } from './hooks/useTicketFulfillmentPoll'
import { useGiftPaymentPoll } from './hooks/useGiftPaymentPoll'
import { useResumePendingGiftPayment } from './hooks/useResumePendingGiftPayment'
import { useInvalidateInvitationPayments } from './hooks/useInvitationPayments'
import {
  GUEST_FLOW_STEP_INDEX,
  type EventGuestBackgroundVariant,
  type EventGuestFinishedVariant,
  type EventGuestFlowStep,
  type EventGuestGiftsVariant,
  type EventGuestGuestsVariant,
  type EventGuestMessageVariant,
  type EventGuestWelcomeVariant,
  type GuestGiftsSubView,
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
  guestsVariant: EventGuestGuestsVariant
  giftsVariant: EventGuestGiftsVariant
  messageVariant: EventGuestMessageVariant
  finishedVariant: EventGuestFinishedVariant
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

function giftStatusToCheckoutOutcome(status: GuestPaymentStatusResponse): GiftCheckoutResponse {
  return {
    order_id: status.order_id,
    payment_id: status.payment_id,
    payment_status: status.payment_status,
    payment_method: status.payment_method ?? null,
    next_action: status.next_action,
    total_cents: status.total_cents ?? null,
    pix: status.pix ?? null,
  }
}

export function EventGuestFlow({
  event,
  invitationId,
  backgroundVariant,
  welcomeVariant,
  guestsVariant,
  giftsVariant,
  messageVariant,
  finishedVariant: _finishedVariant,
}: Props) {
  const { t } = useTranslation()
  const loaderData = useGuestInvitationLoaderData()
  const pendingGiftPayment = loaderData?.pendingGiftPayment ?? null
  const invitationAccess = useInvitationAccess()
  const guestInvitation = useGuestInvitation(event.id, invitationId)
  const invalidateInvitationPayments = useInvalidateInvitationPayments()
  const viewportRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const animatingRef = useRef(false)
  const activeStepRef = useRef<EventGuestFlowStep>('welcome')
  const transitionRef = useRef<SlideTransition | null>(null)
  const checkoutIdempotencyKeyRef = useRef<string | null>(null)

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
  const [giftsSubView, setGiftsSubView] = useState<GuestGiftsSubView>('catalog')
  const [giftsBootstrap, setGiftsBootstrap] = useState<'ready' | 'resolving'>('ready')
  const [checkout, setCheckout] = useState<GuestCheckoutSnapshot | null>(defaultDraftState.checkout)
  const [coupleMessage, setCoupleMessage] = useState(defaultDraftState.coupleMessage)
  const [guestEmail, setGuestEmail] = useState(defaultDraftState.guestEmail)
  const [messagePhase, setMessagePhase] = useState(defaultDraftState.messagePhase)
  const [giftCapturedEmail, setGiftCapturedEmail] = useState(defaultDraftState.giftCapturedEmail)
  const [messageEmailSubStepSkipped, setMessageEmailSubStepSkipped] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState(defaultDraftState.paymentMethod)
  const [pixPayerEmail, setPixPayerEmail] = useState(defaultDraftState.pixPayerEmail)
  const [cardPayment, setCardPayment] = useState(defaultDraftState.cardPayment)
  const [cardSecrets, setCardSecrets] = useState(createDefaultCardPaymentSecrets)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [guestsConfirmed, setGuestsConfirmed] = useState(defaultDraftState.guestsSaved ?? false)
  const [giftsCompleted, setGiftsCompleted] = useState(false)
  const [messageSaved, setMessageSaved] = useState(defaultDraftState.messageSaved ?? false)
  const [lastSavedGuestsFingerprint, setLastSavedGuestsFingerprint] = useState<string | null>(
    defaultDraftState.lastSavedGuestsFingerprint ?? null,
  )
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(
    defaultDraftState.lastSavedMessage ?? null,
  )
  const [maxProgressIndexReached, setMaxProgressIndexReached] = useState(0)
  const [guestsConfirmLoading, setGuestsConfirmLoading] = useState(false)
  const [pendingTicketSlotIds, setPendingTicketSlotIds] = useState<string[]>([])
  const [giftPaymentId, setGiftPaymentId] = useState<string | null>(null)
  const [giftCheckoutOutcome, setGiftCheckoutOutcome] = useState<GiftCheckoutResponse | null>(null)
  const [confirmValidationHighlight, setConfirmValidationHighlight] =
    useState<GuestSlotValidationResult | null>(null)
  const [confirmValidationGuestIndex, setConfirmValidationGuestIndex] = useState<number | undefined>(
    undefined,
  )
  const [paymentNavigationFieldErrors, setPaymentNavigationFieldErrors] = useState<
    CardFormValidation['fieldErrors'] | undefined
  >(undefined)
  const [messageSubmitting, setMessageSubmitting] = useState(false)
  const [guestEditReturnStep, setGuestEditReturnStep] = useState<EventGuestFlowStep | null>(null)
  const guestEditReturnStepRef = useRef<EventGuestFlowStep | null>(null)
  guestEditReturnStepRef.current = guestEditReturnStep

  const guestPaymentProvider = useMemo(() => getDefaultGuestPaymentProvider(), [])
  const PaymentBlock = guestPaymentProvider.PaymentBlock
  const { canCreateCardToken: canCreateMpCardToken, createCardToken } = useMercadoPago()

  const invitationReady =
    !guestInvitation.isLoading &&
    !guestInvitation.isError &&
    Boolean(guestInvitation.invitation) &&
    Boolean(guestInvitation.ticket)

  const resolvedInvitationId = invitationId ?? guestInvitation.invitation?.id ?? ''

  const applyPendingGiftPayment = useCallback((status: GuestPaymentStatusResponse) => {
    setGiftPaymentId(status.payment_id)
    setGiftCheckoutOutcome(giftStatusToCheckoutOutcome(status))
    setGiftsSubView('payment_poll')
  }, [])

  const pendingCheckout = useMemo(() => {
    if (activeStep !== 'gifts' || !giftPaymentId || giftsSubView !== 'payment_poll') return null
    return {
      paymentId: giftPaymentId,
      orderId: giftCheckoutOutcome?.order_id ?? '',
      idempotencyKey: checkoutIdempotencyKeyRef.current,
    }
  }, [activeStep, giftCheckoutOutcome?.order_id, giftPaymentId, giftsSubView])

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
      pendingCheckout,
      coupleMessage,
      guestEmail,
      messagePhase,
      giftCapturedEmail,
      paymentMethod,
      pixPayerEmail,
      cardPayment,
      guestsSaved: guestsConfirmed,
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
      pendingCheckout,
      coupleMessage,
      guestEmail,
      messagePhase,
      giftCapturedEmail,
      paymentMethod,
      pixPayerEmail,
      cardPayment,
      guestsConfirmed,
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
    setGuestEmail(payload.guestEmail)
    setMessagePhase(payload.messagePhase)
    setGiftCapturedEmail(payload.giftCapturedEmail)
    setMessageEmailSubStepSkipped(
      isValidGuestEmail(payload.guestEmail) || isValidGuestEmail(payload.giftCapturedEmail),
    )
    setPaymentMethod(payload.paymentMethod)
    setPixPayerEmail(payload.pixPayerEmail)
    setCardPayment(payload.cardPayment)
    setCardSecrets(createDefaultCardPaymentSecrets())
    setGuestsConfirmed(payload.guestsSaved ?? false)
    setGiftsCompleted(GUEST_FLOW_STEP_INDEX[payload.activeStep] >= GUEST_FLOW_STEP_INDEX.message)
    setMessageSaved(payload.messageSaved ?? false)
    setLastSavedGuestsFingerprint(payload.lastSavedGuestsFingerprint ?? null)
    setLastSavedMessage(payload.lastSavedMessage ?? null)
    setGiftsSubView('catalog')
    setGiftPaymentId(null)
    setGiftCheckoutOutcome(null)
    setPendingTicketSlotIds([])
    if (payload.activeStep === 'gifts' && pendingGiftPayment) {
      applyPendingGiftPayment(pendingGiftPayment)
      setGiftsBootstrap('ready')
    } else if (payload.activeStep === 'gifts') {
      setGiftsBootstrap('resolving')
    } else {
      setGiftsBootstrap('ready')
    }
    const progressIdx = guestFlowProgressActiveIndex(payload.activeStep)
    setMaxProgressIndexReached(progressIdx >= 0 ? progressIdx : 0)
  }, [applyPendingGiftPayment, pendingGiftPayment])

  const prevActiveStepRef = useRef(activeStep)

  useEffect(() => {
    const prev = prevActiveStepRef.current
    prevActiveStepRef.current = activeStep
    if (activeStep !== 'message' || prev === 'message') return
    const resolvedEmail = resolveSubmitGuestEmail(guestEmail, giftCapturedEmail)
    const skipped = isValidGuestEmail(resolvedEmail)
    setMessageEmailSubStepSkipped(skipped)
    setMessagePhase(skipped ? 'compose' : 'email')
  }, [activeStep, giftCapturedEmail, guestEmail])

  useGuestFlowDraft({
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
    setGuestSlots(buildInitialGuestConfirmSlots(invitation, ticket, guestInvitation.fieldDefinitions))
  }, [
    draftHydrated,
    guestInvitation.fieldDefinitions,
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
      const initial = buildInitialGuestConfirmSlots(
        invitation,
        ticket,
        guestInvitation.fieldDefinitions,
      )
      setGuestSlots(mergeGuestSlotsWithDraft(initial, stored.guestSlots))
    }

    setConfirmPhase('form')
    setConfirmGuestIndex(0)
  }, [event.id, guestInvitation.invitation, guestInvitation.ticket, invitationId])

  activeStepRef.current = activeStep
  transitionRef.current = transition

  const progressDisplayStep = transition ? transition.to : activeStep
  const showProgressIndicator =
    guestFlowShowsProgressIndicator(progressDisplayStep) && guestEditReturnStep === null

  const progressCompletion = useMemo(
    () =>
      buildGuestFlowProgressCompletion({
        guestsConfirmed,
        confirmPhase,
        giftsCompleted,
        messageSaved,
        maxProgressIndexReached,
      }),
    [guestsConfirmed, confirmPhase, giftsCompleted, messageSaved, maxProgressIndexReached],
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
  }, [activeStep, transition, showProgressIndicator, applySlideLayout, event.id, event.name, event.description, giftsSubView])

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
  }, [applySlideLayout, activeStep, transition, showProgressIndicator, giftsSubView])

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

  const animateToBackendWizardStep = useCallback(
    (wizardStep: string | null | undefined) => {
      animateTo(flowStepFromWizardStep(wizardStep))
    },
    [animateTo],
  )

  const hydrateGuestSlotsFromGuestView = useCallback(() => {
    const invitation = guestInvitation.invitation
    const ticket = guestInvitation.ticket
    const guestView = guestInvitation.guestView
    if (!invitation || !ticket || !guestView) return false

    const merged = mergeInvitationGuestSlots(invitation, guestView.guest_slots)
    setGuestSlots(buildInitialGuestConfirmSlots(merged, ticket, guestInvitation.fieldDefinitions))
    return true
  }, [guestInvitation.fieldDefinitions, guestInvitation.guestView, guestInvitation.invitation, guestInvitation.ticket])

  const handleEditGuestsFromFinished = useCallback(() => {
    if (!hydrateGuestSlotsFromGuestView()) return
    setConfirmPhase('review')
    setConfirmGuestIndex(0)
    setConfirmValidationHighlight(null)
    setConfirmValidationGuestIndex(undefined)
    setGuestEditReturnStep('finished')
    animateTo('guests')
  }, [animateTo, hydrateGuestSlotsFromGuestView])

  const resetGiftEditState = useCallback(() => {
    setSelectedProductIds([])
    setGiftPhase('browse')
    setGiftPage(0)
    setGiftsSubView('catalog')
    setCheckout(null)
    setGiftPaymentId(null)
    setGiftCheckoutOutcome(null)
    checkoutIdempotencyKeyRef.current = null
    setCardSecrets(createDefaultCardPaymentSecrets())
    setGiftsBootstrap('ready')
  }, [])

  const handleEditGiftsFromFinished = useCallback(() => {
    resetGiftEditState()
    setGuestEditReturnStep('finished')
    animateTo('gifts')
  }, [animateTo, resetGiftEditState])

  const handleCancelGuestEdit = useCallback(() => {
    hydrateGuestSlotsFromGuestView()
    setConfirmPhase('review')
    setConfirmGuestIndex(0)
    setConfirmValidationHighlight(null)
    setConfirmValidationGuestIndex(undefined)
    const returnStep = guestEditReturnStepRef.current
    setGuestEditReturnStep(null)
    if (returnStep) {
      animateTo(returnStep)
    }
  }, [animateTo, hydrateGuestSlotsFromGuestView])

  const handleCancelGiftEdit = useCallback(() => {
    resetGiftEditState()
    const returnStep = guestEditReturnStepRef.current
    setGuestEditReturnStep(null)
    if (returnStep) {
      animateTo(returnStep)
    }
  }, [animateTo, resetGiftEditState])

  const ticketPoll = useTicketFulfillmentPoll({
    invitationId: resolvedInvitationId,
    invitationAccess,
    pendingSlotIds: pendingTicketSlotIds,
    enabled: pendingTicketSlotIds.length > 0,
    onComplete: (view) => {
      const ticket = guestInvitation.ticket
      if (ticket) {
        setGuestSlots(
          buildInitialGuestConfirmSlots(
            mergeInvitationGuestSlots(view.invitation, view.guest_slots),
            ticket,
            guestInvitation.fieldDefinitions,
          ),
        )
      }
      void guestInvitation.refetchGuestView()
      invalidateInvitationPayments()
      setPendingTicketSlotIds([])
      setGuestsConfirmLoading(false)
      const returnStep = guestEditReturnStepRef.current
      if (returnStep) {
        setGuestEditReturnStep(null)
        animateTo(returnStep)
        return
      }
      animateToBackendWizardStep(view.invitation.wizard_step)
    },
  })

  useEffect(() => {
    if (ticketPoll.state !== 'timeout') return
    message.warning(t('events.detail.guestFlow.ticketPollTimeout'))
    setPendingTicketSlotIds([])
    setGuestsConfirmLoading(false)
    animateToBackendWizardStep('gifts')
  }, [animateToBackendWizardStep, t, ticketPoll.state])

  const handleResumePendingGiftPayment = useCallback(
    (_paymentId: string, status: GuestPaymentStatusResponse) => {
      applyPendingGiftPayment(status)
    },
    [applyPendingGiftPayment],
  )

  useResumePendingGiftPayment({
    invitationId: resolvedInvitationId,
    invitationAccess,
    enabled: giftsBootstrap === 'resolving' && draftHydrated,
    onResume: handleResumePendingGiftPayment,
    onComplete: () => setGiftsBootstrap('ready'),
  })

  const giftPaymentPoll = useGiftPaymentPoll({
    invitationId: resolvedInvitationId,
    invitationAccess,
    paymentId: giftPaymentId,
    enabled: giftsSubView === 'payment_poll' && Boolean(giftPaymentId),
    onTerminal: async (outcome) => {
      if (outcome.payment_status.toUpperCase() === 'APPROVED') {
        setGiftsCompleted(true)
        setGiftPaymentId(null)
        setGiftCheckoutOutcome(null)
        setGiftsSubView('catalog')
        setCardSecrets(createDefaultCardPaymentSecrets())
        checkoutIdempotencyKeyRef.current = null
        invalidateInvitationPayments()
        const refetchResult = await guestInvitation.refetchGuestView()
        const returnStep = guestEditReturnStepRef.current
        if (returnStep) {
          setGuestEditReturnStep(null)
          animateTo(returnStep)
          return
        }
        animateToBackendWizardStep(
          refetchResult.data?.invitation.wizard_step ?? guestInvitation.invitation?.wizard_step,
        )
        return
      }
      message.error(outcome.failure?.message ?? t('events.detail.guestPayment.failedDescription'))
      setGiftsSubView('payment')
    },
  })

  const pixExpiresAt = giftPaymentPoll.pix?.expires_at ?? giftCheckoutOutcome?.pix?.expires_at ?? null
  const [pixRemainingSeconds, setPixRemainingSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!pixExpiresAt || giftsSubView !== 'payment_poll') {
      setPixRemainingSeconds(null)
      return
    }

    const update = () => {
      const expiryMs = Date.parse(pixExpiresAt)
      if (Number.isNaN(expiryMs)) {
        setPixRemainingSeconds(null)
        return
      }
      setPixRemainingSeconds(Math.max(0, Math.floor((expiryMs - Date.now()) / 1000)))
    }

    update()
    const intervalId = window.setInterval(update, 30_000)
    return () => window.clearInterval(intervalId)
  }, [giftsSubView, pixExpiresAt])

  const handleCannotAttend = useCallback(() => {
    const invitation = guestInvitation.invitation
    const ticket = guestInvitation.ticket
    if (!invitation || !ticket) return

    const baseSlots =
      guestSlots.length > 0
        ? guestSlots
        : buildInitialGuestConfirmSlots(invitation, ticket, guestInvitation.fieldDefinitions)
    const declinedSlots = markAllGuestsNotAttending(baseSlots)

    setFlowPath('decline')
    setGuestSlots(declinedSlots)
    setConfirmPhase('review')
    setConfirmGuestIndex(Math.max(0, declinedSlots.length - 1))
    setConfirmValidationHighlight(null)
    setConfirmValidationGuestIndex(undefined)
    animateTo('guests')
  }, [animateTo, guestInvitation.invitation, guestInvitation.ticket, guestSlots])

  useLayoutEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const handleAttendanceConfirmed = useCallback(async () => {
    const resolvedId = invitationId ?? guestInvitation.invitation?.id
    const ticket = guestInvitation.ticket
    if (!resolvedId || !ticket) return

    setGuestsConfirmLoading(true)
    try {
      const payload = buildGuestSlotsSubmitPayload(guestSlots, guestInvitation.fieldDefinitions)
      const result = await confirmGuests(resolvedId, payload, invitationAccess)
      setGuestsConfirmed(true)
      setLastSavedGuestsFingerprint(fingerprintGuestSlotsSubmitPayload(payload))
      if (result.pending_ticket_slot_ids.length > 0) {
        setPendingTicketSlotIds(result.pending_ticket_slot_ids)
        return
      }
      const refetchResult = await guestInvitation.refetchGuestView()
      const refreshedInvitation = refetchResult.data?.invitation ?? guestInvitation.invitation
      const refreshedGuestView = refetchResult.data ?? guestInvitation.guestView
      if (refreshedInvitation && refreshedGuestView) {
        setGuestSlots(
          buildInitialGuestConfirmSlots(
            mergeInvitationGuestSlots(refreshedInvitation, refreshedGuestView.guest_slots),
            ticket,
            guestInvitation.fieldDefinitions,
          ),
        )
      } else if (refreshedInvitation) {
        setGuestSlots(
          buildInitialGuestConfirmSlots(
            refreshedInvitation,
            ticket,
            guestInvitation.fieldDefinitions,
          ),
        )
      }
      invalidateInvitationPayments()
      setGuestsConfirmLoading(false)
      const returnStep = guestEditReturnStepRef.current
      if (returnStep) {
        setGuestEditReturnStep(null)
        animateTo(returnStep)
        return
      }
      animateToBackendWizardStep(result.wizard_step ?? refreshedInvitation?.wizard_step)
    } catch (error) {
      setGuestsConfirmLoading(false)
      message.error(guestInvitationErrorMessage(error, t))
    }
  }, [
      animateTo,
      animateToBackendWizardStep,
      guestInvitation,
      guestSlots,
      invalidateInvitationPayments,
      invitationAccess,
      invitationId,
      t,
  ])

  const handleGiftsConfirmed = useCallback(
    async (snapshot: GuestCheckoutSnapshot) => {
      const returnStep = guestEditReturnStepRef.current
      if (returnStep && snapshot.items.length === 0) {
        setGuestEditReturnStep(null)
        animateTo(returnStep)
        return
      }

      setCheckout(snapshot)
      setGiftCheckoutOutcome(null)
      setGiftPaymentId(null)
      if (snapshot.total_cents > 0) {
        setGiftsSubView('payment')
        return
      }

      const resolvedId = invitationId ?? guestInvitation.invitation?.id
      if (!resolvedId) return

      if (!checkoutIdempotencyKeyRef.current) {
        checkoutIdempotencyKeyRef.current = crypto.randomUUID()
      }

      try {
        const payload = buildGuestCheckoutPayload(resolvedId, snapshot, {
          payment_provider: snapshot.payment_provider ?? 'mercadopago',
          provider_checkout: {},
        })
        await submitGiftCheckout(resolvedId, payload, {
          idempotencyKey: checkoutIdempotencyKeyRef.current,
          invitationAccess,
        })
        invalidateInvitationPayments()
        checkoutIdempotencyKeyRef.current = null
        const refetchResult = await guestInvitation.refetchGuestView()
        setGiftsCompleted(true)
        if (returnStep) {
          setGuestEditReturnStep(null)
          animateTo(returnStep)
          return
        }
        animateToBackendWizardStep(
          refetchResult.data?.invitation.wizard_step ?? guestInvitation.invitation?.wizard_step,
        )
      } catch (error) {
        message.error(guestInvitationErrorMessage(error, t))
      }
    },
    [
      animateTo,
      animateToBackendWizardStep,
      guestInvitation,
      invalidateInvitationPayments,
      invitationAccess,
      invitationId,
      t,
    ],
  )

  const handleGiftPaymentComplete = useCallback(
    async (snapshot: GuestPaymentSnapshot) => {
      const resolvedId = invitationId ?? guestInvitation.invitation?.id
      if (!resolvedId || !checkout) return

      if (snapshot.method === 'card') {
        setCardPayment(snapshot.card)
      }
      setCheckout((prev) =>
        prev ? { ...prev, payment_provider: snapshot.payment_provider } : prev,
      )

      if (!checkoutIdempotencyKeyRef.current) {
        checkoutIdempotencyKeyRef.current = crypto.randomUUID()
      }

      setCheckoutSubmitting(true)
      try {
        const resolvedCheckout = giftOnlyCheckoutSnapshot(checkout)
        const finalizeResult = await finalizeGuestPayment(resolvedCheckout, snapshot, {
          cardSecrets,
          createCardToken: (form) => createCardToken(form),
          canCreateCardToken: canCreateMpCardToken,
        })
        const payload = buildGuestCheckoutPayload(resolvedId, resolvedCheckout, finalizeResult)
        const result = await submitGiftCheckout(resolvedId, payload, {
          idempotencyKey: checkoutIdempotencyKeyRef.current,
          invitationAccess,
        })
        invalidateInvitationPayments()
        setGiftCheckoutOutcome(result)
        setGiftPaymentId(result.payment_id)
        if (result.payment_status.toUpperCase() === 'APPROVED') {
          const capturedEmail = resolveGiftCapturedEmailFromSnapshot(snapshot)
          if (capturedEmail) {
            setGiftCapturedEmail(capturedEmail)
            setGuestEmail((current) => current.trim() || capturedEmail)
            setMessageEmailSubStepSkipped(true)
            setMessagePhase('compose')
          }
          setGiftsCompleted(true)
          setGiftPaymentId(null)
          setGiftCheckoutOutcome(null)
          setGiftsSubView('catalog')
          checkoutIdempotencyKeyRef.current = null
          setCardSecrets(createDefaultCardPaymentSecrets())
          const refetchResult = await guestInvitation.refetchGuestView()
          const returnStep = guestEditReturnStepRef.current
          if (returnStep) {
            setGuestEditReturnStep(null)
            animateTo(returnStep)
            return
          }
          animateToBackendWizardStep(
            refetchResult.data?.invitation.wizard_step ?? guestInvitation.invitation?.wizard_step,
          )
          return
        }
        setGiftsSubView('payment_poll')
      } catch (error) {
        message.error(guestInvitationErrorMessage(error, t))
      } finally {
        setCheckoutSubmitting(false)
      }
    },
    [
      canCreateMpCardToken,
      cardSecrets,
      checkout,
      createCardToken,
      guestInvitation,
      invalidateInvitationPayments,
      invitationAccess,
      invitationId,
      animateTo,
      t,
    ],
  )

  const handleMessageContinue = useCallback(async () => {
    const resolvedId = invitationId ?? guestInvitation.invitation?.id
    if (!resolvedId) return

    const submitEmail = resolveSubmitGuestEmail(guestEmail, giftCapturedEmail)
    if (!submitEmail) {
      showGuestMessageEmailValidationError(t)
      setMessagePhase('email')
      setMessageEmailSubStepSkipped(false)
      return
    }
    if (!isValidGuestEmail(submitEmail)) {
      showGuestMessageEmailInvalidError(t)
      setMessagePhase('email')
      setMessageEmailSubStepSkipped(false)
      return
    }

    setMessageSubmitting(true)
    try {
      const payload = buildGuestMessageSubmitPayload(coupleMessage, submitEmail)
      const invitation = await patchInvitationMessage(resolvedId, payload, invitationAccess)
      setMessageSaved(true)
      setLastSavedMessage(fingerprintGuestMessagePayload(payload))
      setGuestEmail(readGuestEmailFromInvitation(invitation) || submitEmail)
      const fromServer = readGuestMessageFromInvitation(invitation)
      if (fromServer) {
        setCoupleMessage(fromServer)
      }
      await guestInvitation.refetchGuestView()
      animateToBackendWizardStep(invitation.wizard_step)
    } catch (error) {
      message.error(guestInvitationErrorMessage(error, t))
    } finally {
      setMessageSubmitting(false)
    }
  }, [
    animateToBackendWizardStep,
    coupleMessage,
    giftCapturedEmail,
    guestEmail,
    guestInvitation,
    invitationAccess,
    invitationId,
    t,
  ])

  const handleGiftsBack = useCallback(() => {
    if (giftsSubView === 'payment') {
      setGiftsSubView('catalog')
      return
    }
    if (giftsSubView === 'payment_poll') {
      setGiftsSubView('payment')
    }
  }, [giftsSubView])

  const handleCopyGiftPix = useCallback(async () => {
    const code = giftPaymentPoll.pix?.copy_paste_code ?? giftCheckoutOutcome?.pix?.copy_paste_code
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      message.success(t('events.detail.guestPayment.copyPixSuccess'))
    } catch {
      message.error(t('events.detail.guestPayment.copyPixError'))
    }
  }, [giftCheckoutOutcome?.pix?.copy_paste_code, giftPaymentPoll.pix?.copy_paste_code, t])

  const guestsStepBusy = guestsConfirmLoading || ticketPoll.state === 'polling'

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

  const renderGiftPaymentPoll = () => {
    const pix = giftPaymentPoll.pix ?? giftCheckoutOutcome?.pix
    const totalCents =
      giftPaymentPoll.outcome?.total_cents ??
      giftCheckoutOutcome?.total_cents ??
      checkout?.total_cents ??
      0
    const amountLabel = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'BRL',
    }).format(totalCents / 100)
    const countdownLabel =
      pixRemainingSeconds !== null ? formatPixExpiryCountdown(pixRemainingSeconds, t) : null
    const pollFailed =
      giftPaymentPoll.state === 'failed' || giftPaymentPoll.state === 'cancelled'

    return (
      <GuestFlowContentPanel panelSize="stable">
        <Flex vertical align="center" gap={16} style={{ width: '100%' }}>
          {pollFailed ? (
            <Alert
              type="warning"
              showIcon
              message={t('events.detail.guestPayment.failedTitle')}
              description={t('events.detail.guestPayment.failedDescription')}
            />
          ) : (
            <>
              <Text strong style={{ fontSize: 18 }}>
                {amountLabel}
              </Text>
              {pix?.qr_code_base64 ? (
                <img
                  className="guest-payment-qr"
                  src={`data:image/png;base64,${pix.qr_code_base64}`}
                  alt={t('events.detail.guestPayment.qrAlt')}
                />
              ) : null}
              {pix?.copy_paste_code ? (
                <Button type="primary" size="large" onClick={() => void handleCopyGiftPix()}>
                  {t('events.detail.guestPayment.copyPix')}
                </Button>
              ) : null}
              {countdownLabel ? (
                <Text type="secondary">
                  {t('events.detail.guestPayment.expiresIn', { time: countdownLabel })}
                </Text>
              ) : null}
              <Flex align="center" gap={8}>
                <Spin size="small" />
                <Text>{t('events.detail.guestPayment.waitingPix')}</Text>
              </Flex>
            </>
          )}
          <Button size="large" onClick={handleGiftsBack}>
            {t('events.detail.guestMpPayment.back')}
          </Button>
        </Flex>
      </GuestFlowContentPanel>
    )
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
                    guestInvitation.fieldDefinitions,
                  ),
                )
              }
              animateTo('guests')
            }}
          />
        )
      case 'guests':
        if (!guestInvitation.invitation || !guestInvitation.ticket || guestSlots.length === 0) {
          return null
        }
        return (
          <Spin spinning={guestsStepBusy} tip={t('events.detail.guestFlow.confirmingGuests')}>
            <EventGuestConfirmBlock
              key={guestInvitation.invitation.id}
              event={event}
              variant={guestsVariant}
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
              onReviewBackToForm={handleConfirmReviewBackToForm}
              onAttendanceConfirmed={() => void handleAttendanceConfirmed()}
              editFromFinished={guestEditReturnStep !== null}
              onCancelEdit={handleCancelGuestEdit}
              validationHighlight={confirmValidationHighlight}
              validationHighlightGuestIndex={confirmValidationGuestIndex}
              onValidationHighlightClear={() => {
                setConfirmValidationHighlight(null)
                setConfirmValidationGuestIndex(undefined)
              }}
            />
          </Spin>
        )
      case 'gifts':
        if (giftsBootstrap === 'resolving') {
          return (
            <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
              <Spin size="large" />
            </Flex>
          )
        }
        if (giftsSubView === 'payment' && checkout) {
          return (
            <Spin spinning={checkoutSubmitting}>
              <PaymentBlock
                event={event}
                variant="wedding"
                checkout={checkout}
                method={paymentMethod}
                onMethodChange={setPaymentMethod}
                pixPayerEmail={pixPayerEmail}
                onPixPayerEmailChange={setPixPayerEmail}
                cardPayment={cardPayment}
                onCardPaymentChange={setCardPayment}
                cardSecrets={cardSecrets}
                onCardSecretsChange={setCardSecrets}
                onPaymentComplete={(snapshot) => void handleGiftPaymentComplete(snapshot)}
                onBack={handleGiftsBack}
                navigationFieldErrors={paymentNavigationFieldErrors}
                onNavigationFieldErrorsClear={() => setPaymentNavigationFieldErrors(undefined)}
              />
            </Spin>
          )
        }
        if (giftsSubView === 'payment_poll') {
          return renderGiftPaymentPoll()
        }
        return (
          <EventGuestGiftBlock
            event={event}
            invitationId={resolvedInvitationId}
            variant={giftsVariant}
            guestSlots={guestSlots}
            selectedProductIds={selectedProductIds}
            onSelectedProductIdsChange={setSelectedProductIds}
            phase={giftPhase}
            onPhaseChange={setGiftPhase}
            page={giftPage}
            onPageChange={setGiftPage}
            editFromFinished={guestEditReturnStep !== null}
            onCancelEdit={handleCancelGiftEdit}
            onGiftsConfirmed={handleGiftsConfirmed}
          />
        )
      case 'message':
        return (
          <Spin spinning={messageSubmitting}>
            <EventGuestMessageBlock
              event={event}
              variant={messageVariant}
              phase={messagePhase}
              email={guestEmail}
              message={coupleMessage}
              emailSubStepSkipped={messageEmailSubStepSkipped}
              onEmailChange={setGuestEmail}
              onMessageChange={setCoupleMessage}
              onPhaseChange={setMessagePhase}
              onBack={() => animateTo('gifts')}
              onContinue={() => void handleMessageContinue()}
            />
          </Spin>
        )
      case 'finished':
        return (
          <EventGuestFinishedBlock
            event={event}
            invitationId={resolvedInvitationId}
            invitationAccess={invitationAccess}
            guestView={guestInvitation.guestView}
            fieldDefinitions={guestInvitation.fieldDefinitions}
            loading={guestInvitation.isLoading}
            onEditGuests={handleEditGuestsFromFinished}
            onEditGifts={giftsVariant === 'wedding' ? handleEditGiftsFromFinished : undefined}
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
            completion={progressCompletion}
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

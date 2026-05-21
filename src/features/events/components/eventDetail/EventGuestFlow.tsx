import { Flex, Spin, Typography, message } from 'antd'
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { EventGuestConfirmBlock } from './blocks/EventGuestConfirmBlock'
import { EventGuestDeclineBlock } from './blocks/EventGuestDeclineBlock'
import { EventGuestGiftBlock } from './blocks/EventGuestGiftBlock'
import { EventGuestMessageBlock } from './blocks/EventGuestMessageBlock'
import { EventGuestMpPaymentBlock } from './blocks/EventGuestMpPaymentBlock'
import { EventGuestReviewBlock } from './blocks/EventGuestReviewBlock'
import { EventGuestBackgroundBlock } from './blocks/EventGuestBackgroundBlock'
import { EventGuestWelcomeBlock } from './blocks/EventGuestWelcomeBlock'
import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import { createDefaultGuestFlowDraftState } from './guestFlowDraft'
import { loadGuestFlowDraft, mergeGuestSlotsWithDraft } from './guestFlowDraftStorage'
import { guestFlowShowsProgressIndicator } from './guestFlowProgress'
import {
  buildMockCardTokenResult,
  buildGuestMpPaymentPayload,
  logGuestMpPaymentPayload,
  type GuestMpPaymentSnapshot,
} from './guestMpPaymentDraft'
import {
  buildCardOrderFromSnapshot,
  buildPixOrderFromSnapshot,
  createDefaultCardPaymentSecrets,
} from './guestMpPaymentForm'
import { buildInitialGuestConfirmSlots, type GuestConfirmFormSlot } from './guestConfirmMock'
import { useMercadoPago } from '@/features/events/hooks/useMercadoPago'
import { GuestFlowStepIndicator } from './GuestFlowStepIndicator'
import { guestFlowStepUsesContentPanel } from './guestPanelLayout'
import { useGuestFlowDraft, type GuestFlowHydrationPayload } from './useGuestFlowDraft'
import {
  GUEST_FLOW_STEP_INDEX,
  type EventGuestBackgroundVariant,
  type EventGuestConfirmVariant,
  type EventGuestDeclineVariant,
  type EventGuestFlowStep,
  type EventGuestGiftVariant,
  type EventGuestMessageVariant,
  type EventGuestMpPaymentVariant,
  type EventGuestReviewVariant,
  type EventGuestWelcomeVariant,
} from './types'
import { useGuestInvitation } from './useGuestInvitation'
import './eventGuestFlow.css'

const { Text } = Typography

type Props = {
  event: Event
  invitationId?: string
  backgroundVariant: EventGuestBackgroundVariant
  welcomeVariant: EventGuestWelcomeVariant
  declineVariant: EventGuestDeclineVariant
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
  declineVariant,
  confirmVariant,
  giftVariant,
  mpPaymentVariant,
  messageVariant,
  reviewVariant,
}: Props) {
  const { t } = useTranslation()
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
  const [declineMessage, setDeclineMessage] = useState(defaultDraftState.declineMessage)
  const [paymentMethod, setPaymentMethod] = useState(defaultDraftState.paymentMethod)
  const [pixPayerEmail, setPixPayerEmail] = useState(defaultDraftState.pixPayerEmail)
  const [cardPayment, setCardPayment] = useState(defaultDraftState.cardPayment)
  const [cardSecrets, setCardSecrets] = useState(createDefaultCardPaymentSecrets)
  const [mpPaymentSnapshot, setMpPaymentSnapshot] = useState<GuestMpPaymentSnapshot | null>(null)
  const { isConfigured: isMpConfigured, createCardToken } = useMercadoPago()

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
      declineMessage,
      paymentMethod,
      pixPayerEmail,
      cardPayment,
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
      declineMessage,
      paymentMethod,
      pixPayerEmail,
      cardPayment,
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
    setDeclineMessage(payload.declineMessage)
    setPaymentMethod(payload.paymentMethod)
    setPixPayerEmail(payload.pixPayerEmail)
    setCardPayment(payload.cardPayment)
    setCardSecrets(createDefaultCardPaymentSecrets())
    setMpPaymentSnapshot(null)
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

  useLayoutEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const handleAttendanceConfirmed = useCallback(() => {
    animateTo('gift')
  }, [animateTo])

  const handleGiftsConfirmed = useCallback(
    (snapshot: GuestCheckoutSnapshot) => {
      setCheckout(snapshot)
      setMpPaymentSnapshot(null)
      if (snapshot.totalCents > 0) {
        animateTo('mp_payment')
        return
      }
      animateTo('message')
    },
    [animateTo],
  )

  const handlePaymentComplete = useCallback(
    (snapshot: GuestMpPaymentSnapshot) => {
      setMpPaymentSnapshot(snapshot)
      animateTo('message')
    },
    [animateTo],
  )

  const handleMessageContinue = useCallback(() => {
    animateTo('review')
  }, [animateTo])

  const handleMessageBack = useCallback(() => {
    if (checkout && checkout.totalCents > 0) {
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

    if (checkout.totalCents <= 0) {
      clearDraft()
      return
    }

    if (!mpPaymentSnapshot) {
      message.error(t('events.detail.guestReview.paymentPending'))
      return
    }

    try {
      let orderBody
      if (mpPaymentSnapshot.method === 'pix') {
        orderBody = buildPixOrderFromSnapshot(checkout, mpPaymentSnapshot)
      } else {
        const tokenResult = isMpConfigured
          ? await createCardToken({ ...mpPaymentSnapshot.card, ...cardSecrets })
          : buildMockCardTokenResult(mpPaymentSnapshot.card)
        orderBody = buildCardOrderFromSnapshot(checkout, mpPaymentSnapshot, tokenResult)
      }

      logGuestMpPaymentPayload(
        buildGuestMpPaymentPayload(checkout, { snapshot: mpPaymentSnapshot, orderBody }),
      )
      clearDraft()
      setCardSecrets(createDefaultCardPaymentSecrets())
      setMpPaymentSnapshot(null)
    } catch (error) {
      console.error('[guest-mp-payment] finalize error', error)
      message.error(t('events.detail.guestMpPayment.validation.tokenError'))
    }
  }, [
    cardSecrets,
    checkout,
    clearDraft,
    createCardToken,
    isMpConfigured,
    mpPaymentSnapshot,
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
      case 'decline':
        return (
          <EventGuestDeclineBlock
            event={event}
            variant={declineVariant}
            message={declineMessage}
            onMessageChange={setDeclineMessage}
            onBack={() => animateTo('welcome')}
          />
        )
      case 'welcome':
        return (
          <EventGuestWelcomeBlock
            event={event}
            variant={welcomeVariant}
            onCannotAttend={() => {
              setFlowPath('decline')
              animateTo('decline')
            }}
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
            onSlotsChange={setGuestSlots}
            phase={confirmPhase}
            onPhaseChange={setConfirmPhase}
            currentIndex={confirmGuestIndex}
            onCurrentIndexChange={setConfirmGuestIndex}
            onBack={() => animateTo('welcome')}
            onReviewBackToForm={handleConfirmReviewBackToForm}
            onAttendanceConfirmed={handleAttendanceConfirmed}
          />
        )
      case 'gift':
        return (
          <EventGuestGiftBlock
            event={event}
            variant={giftVariant}
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
          <EventGuestMpPaymentBlock
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
            variant={reviewVariant}
            invitation={guestInvitation.invitation}
            guestSlots={guestSlots}
            checkout={checkout}
            mpPaymentSnapshot={mpPaymentSnapshot}
            coupleMessage={coupleMessage}
            fieldDefinitions={guestInvitation.fieldDefinitions}
            onEdit={() => animateTo('welcome')}
            onConfirm={handleFinalConfirm}
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
        <Text type="danger">
          {guestInvitation.missingInvitationId
            ? t('events.detail.guestFlow.invitationRequired')
            : t('events.detail.guestFlow.invitationLoadError')}
        </Text>
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
          <GuestFlowStepIndicator activeStep={progressDisplayStep} checkout={checkout} />
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

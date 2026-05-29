import { Flex, Spin } from 'antd'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import { InvitationAccessProvider } from '@/shared/api/InvitationAccessContext'
import {
  fetchInvitationConfirmation,
  type InvitationConfirmationResponse,
} from '@/features/events/components/blocks/payment/checkoutPayload'
import { GuestConfirmedPageContent } from '@/features/events/components/guestConfirmed/GuestConfirmedPageContent'
import { GuestPaymentPageContent } from '@/features/events/components/guestPayment/GuestPaymentPageContent'
import {
  GuestInvitationPhaseProvider,
  useGuestInvitationPhase,
} from '@/features/events/context/GuestInvitationPhaseContext'
import type { GuestInvitationLoaderData } from '@/features/events/loaders/guestInvitationRoutes'

const EventDetailComposition = lazy(() =>
  import('@/features/events/components/invitationFlow/EventDetailComposition').then((m) => ({
    default: m.EventDetailComposition,
  })),
)

function InvitationGuestConfirmedSection({
  loaderData,
}: {
  loaderData: GuestInvitationLoaderData
}) {
  const [confirmation, setConfirmation] = useState<InvitationConfirmationResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchInvitationConfirmation(
          loaderData.invitationId,
          loaderData.invitationAccess,
        )
        if (!cancelled) setConfirmation(data)
      } catch {
        if (!cancelled) setConfirmation(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loaderData.invitationAccess, loaderData.invitationId])

  return (
    <GuestConfirmedPageContent
      event={loaderData.event}
      loaderData={loaderData}
      confirmation={confirmation}
      loading={loading}
    />
  )
}

function InvitationGuestPageBody({ loaderData }: { loaderData: GuestInvitationLoaderData }) {
  const { phase } = useGuestInvitationPhase()

  if (phase === 'payment') {
    return <GuestPaymentPageContent loaderData={loaderData} />
  }

  if (phase === 'confirmed') {
    return <InvitationGuestConfirmedSection loaderData={loaderData} />
  }

  return (
    <Suspense
      fallback={
        <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
          <Spin size="large" />
        </Flex>
      }
    >
      <EventDetailComposition event={loaderData.event} invitationId={loaderData.invitationId} />
    </Suspense>
  )
}

function InvitationGuestPageInner() {
  const loaderData = useLoaderData() as GuestInvitationLoaderData

  return (
    <GuestInvitationPhaseProvider initialPhase={loaderData.phase}>
      <InvitationGuestPageBody loaderData={loaderData} />
    </GuestInvitationPhaseProvider>
  )
}

export function InvitationGuestPage() {
  const { invitationAccess } = useLoaderData() as GuestInvitationLoaderData

  return (
    <InvitationAccessProvider value={invitationAccess}>
      <InvitationGuestPageInner />
    </InvitationAccessProvider>
  )
}

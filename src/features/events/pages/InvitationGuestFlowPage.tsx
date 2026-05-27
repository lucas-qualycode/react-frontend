import { Flex, Spin } from 'antd'
import { lazy, Suspense } from 'react'
import { useLoaderData } from 'react-router-dom'
import type { InvitationGuestLoaderData } from '@/features/events/loaders/invitationGuestLoader'
import { InvitationAccessProvider } from '@/shared/api/InvitationAccessContext'

const EventDetailComposition = lazy(() =>
  import('@/features/events/components/invitationFlow/EventDetailComposition').then((m) => ({
    default: m.EventDetailComposition,
  })),
)

function InvitationGuestFlowPageContent() {
  const { event, invitationId } = useLoaderData() as InvitationGuestLoaderData

  return (
    <Suspense
      fallback={
        <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
          <Spin size="large" />
        </Flex>
      }
    >
      <EventDetailComposition event={event} invitationId={invitationId} />
    </Suspense>
  )
}

export function InvitationGuestFlowPage() {
  const { invitationAccess } = useLoaderData() as InvitationGuestLoaderData

  return (
    <InvitationAccessProvider value={invitationAccess}>
      <InvitationGuestFlowPageContent />
    </InvitationAccessProvider>
  )
}

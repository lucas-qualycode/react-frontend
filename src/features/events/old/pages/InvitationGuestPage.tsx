import { Flex, Spin } from 'antd'
import { lazy, Suspense } from 'react'
import { useLoaderData } from 'react-router-dom'
import { InvitationAccessProvider } from '@/shared/api/InvitationAccessContext'
import type { GuestInvitationLoaderData } from '@/features/events/loaders/guestInvitationRoutes'

const EventDetailComposition = lazy(() =>
  import('@/features/events/components/invitationFlow/EventDetailComposition').then((m) => ({
    default: m.EventDetailComposition,
  })),
)

export function InvitationGuestPage() {
  const loaderData = useLoaderData() as GuestInvitationLoaderData

  return (
    <InvitationAccessProvider value={loaderData.invitationAccess}>
      <Suspense
        fallback={
          <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
            <Spin size="large" />
          </Flex>
        }
      >
        <EventDetailComposition event={loaderData.event} invitationId={loaderData.invitationId} />
      </Suspense>
    </InvitationAccessProvider>
  )
}

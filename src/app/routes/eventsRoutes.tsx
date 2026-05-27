import { lazy } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { RouteObject } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'
import { createInvitationGuestLoader } from '@/features/events/loaders/invitationGuestLoader'
import { SuspensePage } from './shell'

const EventCreatePage = lazy(() =>
  import('@/features/events/pages/EventCreatePage').then((m) => ({
    default: m.EventCreatePage,
  })),
)
const EventDetailPage = lazy(() =>
  import('@/features/events/pages/EventDetailPage').then((m) => ({
    default: m.EventDetailPage,
  })),
)
const InvitationGuestFlowPage = lazy(() =>
  import('@/features/events/pages/InvitationGuestFlowPage').then((m) => ({
    default: m.InvitationGuestFlowPage,
  })),
)
const InvitationUnavailablePage = lazy(() =>
  import('@/features/events/pages/InvitationUnavailablePage').then((m) => ({
    default: m.InvitationUnavailablePage,
  })),
)
const EventEditPage = lazy(() =>
  import('@/features/events/pages/EventEditPage').then((m) => ({
    default: m.EventEditPage,
  })),
)
const UserEventsListPage = lazy(() =>
  import('@/features/events/pages/UserEventsListPage').then((m) => ({
    default: m.UserEventsListPage,
  })),
)

type ProtectedProps = { children: ReactNode }
type ProtectedComponent = ComponentType<ProtectedProps>

export function getEventsRoutes(
  Protected: ProtectedComponent,
  queryClient: QueryClient,
): RouteObject[] {
  const invitationGuestLoader = createInvitationGuestLoader(queryClient)

  return [
    {
      path: 'events/create',
      element: (
        <Protected>
          <EventCreatePage />
        </Protected>
      ),
    },
    {
      path: 'events/:id/invitation/:invitationId/unavailable',
      element: (
        <SuspensePage>
          <InvitationUnavailablePage />
        </SuspensePage>
      ),
    },
    {
      path: 'events/:id/invitation/:invitationId',
      loader: invitationGuestLoader,
      element: (
        <SuspensePage>
          <InvitationGuestFlowPage />
        </SuspensePage>
      ),
    },
    {
      path: 'events/:id',
      element: (
        <Protected>
          <EventDetailPage />
        </Protected>
      ),
    },
    {
      path: 'events/:id/edit',
      element: (
        <Protected>
          <EventEditPage />
        </Protected>
      ),
    },
    {
      path: 'user-events',
      element: (
        <Protected>
          <UserEventsListPage />
        </Protected>
      ),
    },
  ]
}

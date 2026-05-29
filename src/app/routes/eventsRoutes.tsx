import { lazy } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { RouteObject } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'
import { createGuestInvitationLoader } from '@/features/events/loaders/invitationGuestLoader'
import { redirectGuestInvitationCanonical } from '@/features/events/loaders/redirectGuestInvitationCanonical'
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
const InvitationGuestPage = lazy(() =>
  import('@/features/events/pages/InvitationGuestPage').then((m) => ({
    default: m.InvitationGuestPage,
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
  const guestInvitationLoader = createGuestInvitationLoader(queryClient)

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
      path: 'events/:id/invitation/:invitationId/payment',
      loader: redirectGuestInvitationCanonical,
    },
    {
      path: 'events/:id/invitation/:invitationId/confirmed',
      loader: redirectGuestInvitationCanonical,
    },
    {
      path: 'events/:id/invitation/:invitationId',
      loader: guestInvitationLoader,
      element: (
        <SuspensePage>
          <InvitationGuestPage />
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

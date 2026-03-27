import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'

const EventCreatePage = lazy(() =>
  import('@/features/events/pages/EventCreatePage').then((m) => ({
    default: m.EventCreatePage,
  }))
)
const EventDetailPage = lazy(() =>
  import('@/features/events/pages/EventDetailPage').then((m) => ({
    default: m.EventDetailPage,
  }))
)
const EventEditPage = lazy(() =>
  import('@/features/events/pages/EventEditPage').then((m) => ({
    default: m.EventEditPage,
  }))
)
const UserEventsListPage = lazy(() =>
  import('@/features/events/pages/UserEventsListPage').then((m) => ({
    default: m.UserEventsListPage,
  }))
)

type ProtectedProps = { children: ReactNode }
type ProtectedComponent = ComponentType<ProtectedProps>

export function getEventsRoutes(Protected: ProtectedComponent): RouteObject[] {
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

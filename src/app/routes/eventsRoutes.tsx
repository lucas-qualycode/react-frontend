import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import type { QueryClient } from '@tanstack/react-query'
import type { RouteObject } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'
import { createGuestInvitationLoader } from '@/features/events/loaders/invitationGuestLoader'
import { redirectGuestInvitationCanonical } from '@/features/events/loaders/redirectGuestInvitationCanonical'
import { SuspensePage } from './shell'

const EventCreateWizardLayout = lazy(() =>
  import('@/features/events/create/EventCreateWizardLayout').then((m) => ({
    default: m.EventCreateWizardLayout,
  })),
)
const NewIdentityStepPage = lazy(() =>
  import('@/features/events/create/pages/NewIdentityStepPage').then((m) => ({
    default: m.NewIdentityStepPage,
  })),
)
const NewVenueStepPage = lazy(() =>
  import('@/features/events/create/pages/NewVenueStepPage').then((m) => ({
    default: m.NewVenueStepPage,
  })),
)
const NewScheduleStepPage = lazy(() =>
  import('@/features/events/create/pages/NewScheduleStepPage').then((m) => ({
    default: m.NewScheduleStepPage,
  })),
)
const NewProductsStepPage = lazy(() =>
  import('@/features/events/create/pages/NewProductsStepPage').then((m) => ({
    default: m.NewProductsStepPage,
  })),
)
const NewTicketsStepPage = lazy(() =>
  import('@/features/events/create/pages/NewTicketsStepPage').then((m) => ({
    default: m.NewTicketsStepPage,
  })),
)
const NewInvitationsStepPage = lazy(() =>
  import('@/features/events/create/pages/NewInvitationsStepPage').then((m) => ({
    default: m.NewInvitationsStepPage,
  })),
)
const NewMerchProductRoutePage = lazy(() =>
  import('@/features/events/create/pages/NewMerchProductRoutePage').then((m) => ({
    default: m.NewMerchProductRoutePage,
  })),
)
const NewTicketProductRoutePage = lazy(() =>
  import('@/features/events/create/pages/NewTicketProductRoutePage').then((m) => ({
    default: m.NewTicketProductRoutePage,
  })),
)
const NewInvitationEditorRoutePage = lazy(() =>
  import('@/features/events/create/pages/NewInvitationEditorRoutePage').then((m) => ({
    default: m.NewInvitationEditorRoutePage,
  })),
)
const EventEditLayout = lazy(() =>
  import('@/features/events/edit/EventEditLayout').then((m) => ({
    default: m.EventEditLayout,
  })),
)
const EditDetailsPage = lazy(() =>
  import('@/features/events/edit/pages/EditDetailsPage').then((m) => ({
    default: m.EditDetailsPage,
  })),
)
const EditVenuePage = lazy(() =>
  import('@/features/events/edit/pages/EditVenuePage').then((m) => ({
    default: m.EditVenuePage,
  })),
)
const EditSchedulePage = lazy(() =>
  import('@/features/events/edit/pages/EditSchedulePage').then((m) => ({
    default: m.EditSchedulePage,
  })),
)
const EditProductsPage = lazy(() =>
  import('@/features/events/edit/pages/EditProductsPage').then((m) => ({
    default: m.EditProductsPage,
  })),
)
const EditTicketsPage = lazy(() =>
  import('@/features/events/edit/pages/EditTicketsPage').then((m) => ({
    default: m.EditTicketsPage,
  })),
)
const EditInvitationsPage = lazy(() =>
  import('@/features/events/edit/pages/EditInvitationsPage').then((m) => ({
    default: m.EditInvitationsPage,
  })),
)
const EditMerchProductRoutePage = lazy(() =>
  import('@/features/events/edit/pages/EditMerchProductRoutePage').then((m) => ({
    default: m.EditMerchProductRoutePage,
  })),
)
const EditTicketProductRoutePage = lazy(() =>
  import('@/features/events/edit/pages/EditTicketProductRoutePage').then((m) => ({
    default: m.EditTicketProductRoutePage,
  })),
)
const EditInvitationEditorRoutePage = lazy(() =>
  import('@/features/events/edit/pages/EditInvitationEditorRoutePage').then((m) => ({
    default: m.EditInvitationEditorRoutePage,
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
      path: 'events/new',
      element: (
        <Protected>
          <EventCreateWizardLayout />
        </Protected>
      ),
      children: [
        { index: true, element: <Navigate to="identity" replace /> },
        { path: 'identity', element: <NewIdentityStepPage /> },
        { path: ':eventId/identity', element: <NewIdentityStepPage /> },
        { path: ':eventId/venue', element: <NewVenueStepPage /> },
        { path: ':eventId/schedule', element: <NewScheduleStepPage /> },
        { path: ':eventId/products', element: <NewProductsStepPage /> },
        { path: ':eventId/products/new', element: <NewMerchProductRoutePage /> },
        { path: ':eventId/products/:productId', element: <NewMerchProductRoutePage /> },
        { path: ':eventId/tickets', element: <NewTicketsStepPage /> },
        { path: ':eventId/tickets/new', element: <NewTicketProductRoutePage /> },
        { path: ':eventId/tickets/:productId', element: <NewTicketProductRoutePage /> },
        { path: ':eventId/invitations', element: <NewInvitationsStepPage /> },
        { path: ':eventId/invitations/new', element: <NewInvitationEditorRoutePage /> },
        { path: ':eventId/invitations/:invitationId', element: <NewInvitationEditorRoutePage /> },
      ],
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
      path: 'events/:id/edit',
      element: (
        <Protected>
          <EventEditLayout />
        </Protected>
      ),
      children: [
        { index: true, element: <Navigate to="details" replace /> },
        { path: 'details', element: <EditDetailsPage /> },
        { path: 'venue', element: <EditVenuePage /> },
        { path: 'schedule', element: <EditSchedulePage /> },
        { path: 'products', element: <EditProductsPage /> },
        { path: 'products/new', element: <EditMerchProductRoutePage /> },
        { path: 'products/:productId', element: <EditMerchProductRoutePage /> },
        { path: 'tickets', element: <EditTicketsPage /> },
        { path: 'tickets/new', element: <EditTicketProductRoutePage /> },
        { path: 'tickets/:ticketId', element: <EditTicketProductRoutePage /> },
        { path: 'invitations', element: <EditInvitationsPage /> },
        { path: 'invitations/new', element: <EditInvitationEditorRoutePage /> },
        { path: 'invitations/:invitationId', element: <EditInvitationEditorRoutePage /> },
      ],
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
      path: 'user-events',
      element: (
        <Protected>
          <UserEventsListPage />
        </Protected>
      ),
    },
  ]
}

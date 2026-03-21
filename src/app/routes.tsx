import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Flex, Spin } from 'antd'
import { Layout } from '@/app/Layout'
import { ProtectedRoute } from '@/app/ProtectedRoute'

const HomePage = lazy(() =>
  import('@/features/home/HomePage').then((m) => ({ default: m.HomePage }))
)
const SignInPage = lazy(() =>
  import('@/features/auth/SignInPage').then((m) => ({ default: m.SignInPage }))
)
const SignUpPage = lazy(() =>
  import('@/features/auth/SignUpPage').then((m) => ({ default: m.SignUpPage }))
)
const AuthCompletePage = lazy(() =>
  import('@/features/auth/AuthCompletePage').then((m) => ({
    default: m.AuthCompletePage,
  }))
)
const SignInWithLinkPage = lazy(() =>
  import('@/features/auth/SignInWithLinkPage').then((m) => ({
    default: m.SignInWithLinkPage,
  }))
)
const SignInWithPhonePage = lazy(() =>
  import('@/features/auth/SignInWithPhonePage').then((m) => ({
    default: m.SignInWithPhonePage,
  }))
)
const GeneralEventsPage = lazy(() =>
  import('@/features/events/GeneralEventsPage').then((m) => ({
    default: m.GeneralEventsPage,
  }))
)
const EventCreatePage = lazy(() =>
  import('@/features/events/EventCreatePage').then((m) => ({
    default: m.EventCreatePage,
  }))
)
const EventDetailPage = lazy(() =>
  import('@/features/events/EventDetailPage').then((m) => ({
    default: m.EventDetailPage,
  }))
)
const EventUserProductsPage = lazy(() =>
  import('@/features/events/EventUserProductsPage').then((m) => ({
    default: m.EventUserProductsPage,
  }))
)
const SchedulesListPage = lazy(() =>
  import('@/features/events/SchedulesListPage').then((m) => ({
    default: m.SchedulesListPage,
  }))
)
const ScheduleFormPage = lazy(() =>
  import('@/features/events/ScheduleFormPage').then((m) => ({
    default: m.ScheduleFormPage,
  }))
)
const ProductsListPage = lazy(() =>
  import('@/features/events/ProductsListPage').then((m) => ({
    default: m.ProductsListPage,
  }))
)
const ProductFormPage = lazy(() =>
  import('@/features/events/ProductFormPage').then((m) => ({
    default: m.ProductFormPage,
  }))
)
const InvitationsListPage = lazy(() =>
  import('@/features/events/InvitationsListPage').then((m) => ({
    default: m.InvitationsListPage,
  }))
)
const InvitationFormPage = lazy(() =>
  import('@/features/events/InvitationFormPage').then((m) => ({
    default: m.InvitationFormPage,
  }))
)
const InvitationViewPage = lazy(() =>
  import('@/features/invitations/InvitationViewPage').then((m) => ({
    default: m.InvitationViewPage,
  }))
)
const InvitationConfirmedPage = lazy(() =>
  import('@/features/invitations/InvitationConfirmedPage').then((m) => ({
    default: m.InvitationConfirmedPage,
  }))
)
const InvitationDeclinedPage = lazy(() =>
  import('@/features/invitations/InvitationDeclinedPage').then((m) => ({
    default: m.InvitationDeclinedPage,
  }))
)
const InvitationExpiredPage = lazy(() =>
  import('@/features/invitations/InvitationExpiredPage').then((m) => ({
    default: m.InvitationExpiredPage,
  }))
)
const FavoritesPage = lazy(() =>
  import('@/features/favorites/FavoritesPage').then((m) => ({
    default: m.FavoritesPage,
  }))
)
const UserEventsListPage = lazy(() =>
  import('@/features/events/UserEventsListPage').then((m) => ({
    default: m.UserEventsListPage,
  }))
)
const TicketsPage = lazy(() =>
  import('@/features/tickets/TicketsPage').then((m) => ({
    default: m.TicketsPage,
  }))
)
const PaymentResultPage = lazy(() =>
  import('@/features/payment/PaymentResultPage').then((m) => ({
    default: m.PaymentResultPage,
  }))
)
const OrdersPage = lazy(() =>
  import('@/features/orders/OrdersPage').then((m) => ({
    default: m.OrdersPage,
  }))
)
const SettingsLayout = lazy(() =>
  import('@/features/settings/SettingsLayout').then((m) => ({
    default: m.SettingsLayout,
  }))
)
const ProfileSettingsSection = lazy(() =>
  import('@/features/settings/sections/ProfileSettingsSection').then((m) => ({
    default: m.ProfileSettingsSection,
  }))
)
const NotificationsSettingsSection = lazy(() =>
  import('@/features/settings/sections/NotificationsSettingsSection').then((m) => ({
    default: m.NotificationsSettingsSection,
  }))
)
const LanguageRegionSettingsSection = lazy(() =>
  import('@/features/settings/sections/LanguageRegionSettingsSection').then((m) => ({
    default: m.LanguageRegionSettingsSection,
  }))
)
const PrivacySettingsSection = lazy(() =>
  import('@/features/settings/sections/settingsPlaceholders').then((m) => ({
    default: m.PrivacySettingsSection,
  }))
)
const AppearanceSettingsSection = lazy(() =>
  import('@/features/settings/sections/settingsPlaceholders').then((m) => ({
    default: m.AppearanceSettingsSection,
  }))
)
const SecurityPlaceholderSettingsSection = lazy(() =>
  import('@/features/settings/sections/settingsPlaceholders').then((m) => ({
    default: m.SecurityPlaceholderSettingsSection,
  }))
)

function PageFallback() {
  return (
    <Flex style={{ minHeight: '30vh' }} align="center" justify="center">
      <Spin size="large" aria-label="Loading" />
    </Flex>
  )
}

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SuspensePage>{children}</SuspensePage>
    </ProtectedRoute>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <SuspensePage><HomePage /></SuspensePage> },
      {
        path: 'signin',
        element: <SuspensePage><SignInPage /></SuspensePage>,
      },
      {
        path: 'signin/link',
        element: <SuspensePage><SignInWithLinkPage /></SuspensePage>,
      },
      {
        path: 'signin/phone',
        element: <SuspensePage><SignInWithPhonePage /></SuspensePage>,
      },
      {
        path: 'signup',
        element: <SuspensePage><SignUpPage /></SuspensePage>,
      },
      {
        path: 'auth/complete',
        element: <SuspensePage><AuthCompletePage /></SuspensePage>,
      },
      {
        path: 'events',
        element: <Protected><GeneralEventsPage /></Protected>,
      },
      {
        path: 'events/create',
        element: <Protected><EventCreatePage /></Protected>,
      },
      {
        path: 'events/:id',
        element: <Protected><EventDetailPage /></Protected>,
      },
      {
        path: 'events/:id/guests',
        element: (
          <SuspensePage>
            <EventUserProductsPage />
          </SuspensePage>
        ),
      },
      {
        path: 'events/:eventId/schedules',
        element: <Protected><SchedulesListPage /></Protected>,
      },
      {
        path: 'events/:eventId/schedules/new',
        element: <Protected><ScheduleFormPage /></Protected>,
      },
      {
        path: 'events/:eventId/schedules/:scheduleId/edit',
        element: <Protected><ScheduleFormPage /></Protected>,
      },
      {
        path: 'events/:eventId/products',
        element: <Protected><ProductsListPage /></Protected>,
      },
      {
        path: 'events/:eventId/products/new',
        element: <Protected><ProductFormPage /></Protected>,
      },
      {
        path: 'events/:eventId/products/:productId/edit',
        element: <Protected><ProductFormPage /></Protected>,
      },
      {
        path: 'events/:eventId/products/:productId/invitations',
        element: <Protected><InvitationsListPage /></Protected>,
      },
      {
        path: 'events/:eventId/products/:productId/invitations/new',
        element: <Protected><InvitationFormPage /></Protected>,
      },
      {
        path: 'events/:eventId/products/:productId/invitations/:invitationId/edit',
        element: <Protected><InvitationFormPage /></Protected>,
      },
      {
        path: 'events/invitations/:id',
        element: (
          <SuspensePage>
            <InvitationViewPage />
          </SuspensePage>
        ),
      },
      {
        path: 'events/invitations/:id/confirmed',
        element: (
          <SuspensePage>
            <InvitationConfirmedPage />
          </SuspensePage>
        ),
      },
      {
        path: 'events/invitations/:id/declined',
        element: (
          <SuspensePage>
            <InvitationDeclinedPage />
          </SuspensePage>
        ),
      },
      {
        path: 'events/invitations/:id/expired',
        element: (
          <SuspensePage>
            <InvitationExpiredPage />
          </SuspensePage>
        ),
      },
      {
        path: 'favorites',
        element: <Protected><FavoritesPage /></Protected>,
      },
      {
        path: 'user-events',
        element: <Protected><UserEventsListPage /></Protected>,
      },
      {
        path: 'tickets',
        element: <Protected><TicketsPage /></Protected>,
      },
      {
        path: 'payment/result',
        element: <Protected><PaymentResultPage /></Protected>,
      },
      {
        path: 'orders',
        element: <Protected><OrdersPage /></Protected>,
      },
      {
        path: 'settings',
        element: (
          <Protected>
            <SettingsLayout />
          </Protected>
        ),
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          {
            path: 'profile',
            element: (
              <SuspensePage>
                <ProfileSettingsSection />
              </SuspensePage>
            ),
          },
          {
            path: 'notifications',
            element: (
              <SuspensePage>
                <NotificationsSettingsSection />
              </SuspensePage>
            ),
          },
          {
            path: 'privacy',
            element: (
              <SuspensePage>
                <PrivacySettingsSection />
              </SuspensePage>
            ),
          },
          {
            path: 'appearance',
            element: (
              <SuspensePage>
                <AppearanceSettingsSection />
              </SuspensePage>
            ),
          },
          {
            path: 'language',
            element: (
              <SuspensePage>
                <LanguageRegionSettingsSection />
              </SuspensePage>
            ),
          },
          {
            path: 'security',
            element: (
              <SuspensePage>
                <SecurityPlaceholderSettingsSection />
              </SuspensePage>
            ),
          },
          { path: '*', element: <Navigate to="/settings/profile" replace /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

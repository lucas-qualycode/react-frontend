import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'

const SettingsLayout = lazy(() =>
  import('@/features/settings/SettingsLayout').then((m) => ({
    default: m.SettingsLayout,
  }))
)

type ProtectedProps = { children: ReactNode }
type ProtectedComponent = ComponentType<ProtectedProps>

export function getSettingsRoutes(Protected: ProtectedComponent): RouteObject[] {
  return [
    {
      path: 'settings/privacy',
      element: <Navigate to={{ pathname: '/settings', search: '?section=profile' }} replace />,
    },
    {
      path: 'settings/profile',
      element: <Navigate to={{ pathname: '/settings', search: '?section=profile' }} replace />,
    },
    {
      path: 'settings/notifications',
      element: (
        <Navigate to={{ pathname: '/settings', search: '?section=notifications' }} replace />
      ),
    },
    {
      path: 'settings/appearance',
      element: (
        <Navigate to={{ pathname: '/settings', search: '?section=appearance' }} replace />
      ),
    },
    {
      path: 'settings/language',
      element: <Navigate to={{ pathname: '/settings', search: '?section=language' }} replace />,
    },
    {
      path: 'settings/security',
      element: <Navigate to={{ pathname: '/settings', search: '?section=security' }} replace />,
    },
    {
      path: 'settings/*',
      element: <Navigate to={{ pathname: '/settings', search: '?section=profile' }} replace />,
    },
    {
      path: 'settings',
      element: (
        <Protected>
          <SettingsLayout />
        </Protected>
      ),
    },
  ]
}

import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'

const SignInPage = lazy(() =>
  import('@/features/auth/pages/SignInPage').then((m) => ({ default: m.SignInPage }))
)
const SignUpPage = lazy(() =>
  import('@/features/auth/pages/SignUpPage').then((m) => ({ default: m.SignUpPage }))
)
const AuthCompletePage = lazy(() =>
  import('@/features/auth/pages/AuthCompletePage').then((m) => ({
    default: m.AuthCompletePage,
  }))
)
const SignInWithLinkPage = lazy(() =>
  import('@/features/auth/pages/SignInWithLinkPage').then((m) => ({
    default: m.SignInWithLinkPage,
  }))
)
const SignInWithPhonePage = lazy(() =>
  import('@/features/auth/pages/SignInWithPhonePage').then((m) => ({
    default: m.SignInWithPhonePage,
  }))
)

type SuspensePageProps = { children: ReactNode }
type SuspensePageComponent = ComponentType<SuspensePageProps>

export function getAuthRoutes(SuspensePage: SuspensePageComponent): RouteObject[] {
  return [
    {
      path: 'signin',
      element: (
        <SuspensePage>
          <SignInPage />
        </SuspensePage>
      ),
    },
    {
      path: 'signin/link',
      element: (
        <SuspensePage>
          <SignInWithLinkPage />
        </SuspensePage>
      ),
    },
    {
      path: 'signin/phone',
      element: (
        <SuspensePage>
          <SignInWithPhonePage />
        </SuspensePage>
      ),
    },
    {
      path: 'signup',
      element: (
        <SuspensePage>
          <SignUpPage />
        </SuspensePage>
      ),
    },
    {
      path: 'auth/complete',
      element: (
        <SuspensePage>
          <AuthCompletePage />
        </SuspensePage>
      ),
    },
  ]
}

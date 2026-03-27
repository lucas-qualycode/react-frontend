import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'

const HomePage = lazy(() =>
  import('@/features/home/HomePage').then((m) => ({ default: m.HomePage }))
)

type SuspensePageProps = { children: ReactNode }
type SuspensePageComponent = ComponentType<SuspensePageProps>

export function getHomeRoute(SuspensePage: SuspensePageComponent): RouteObject {
  return {
    index: true,
    element: (
      <SuspensePage>
        <HomePage />
      </SuspensePage>
    ),
  }
}

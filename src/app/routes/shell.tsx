import { Suspense } from 'react'
import { Flex, Spin } from 'antd'
import { ProtectedRoute } from '@/app/ProtectedRoute'

export function PageFallback() {
  return (
    <Flex style={{ minHeight: '30vh' }} align="center" justify="center">
      <Spin size="large" aria-label="Loading" />
    </Flex>
  )
}

export function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

export function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SuspensePage>{children}</SuspensePage>
    </ProtectedRoute>
  )
}

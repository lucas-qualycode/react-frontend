import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Flex, Spin } from 'antd'
import { useAuth } from '@/app/auth/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <Flex style={{ minHeight: '40vh' }} align="center" justify="center">
        <Spin size="large" aria-label="Loading" />
      </Flex>
    )
  }
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />
  }
  return <>{children}</>
}

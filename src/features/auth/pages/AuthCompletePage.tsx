import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Flex, message, Spin } from 'antd'
import { getAuth, isSignInWithEmailLink } from 'firebase/auth'
import { app } from '@/app/firebase'
import { useAuth, getEmailForSignInKey } from '@/app/auth/AuthContext'

const auth = getAuth(app)

export function AuthCompletePage() {
  const { signInWithEmailLink } = useAuth()
  const location = useLocation()
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending')

  useEffect(() => {
    const href = window.location.href
    if (!isSignInWithEmailLink(auth, href)) {
      message.error('Invalid or expired sign-in link.')
      setStatus('error')
      return
    }
    const email = window.localStorage.getItem(getEmailForSignInKey())
    if (!email) {
      message.error('Please open the sign-in link from the same device where you requested it.')
      setStatus('error')
      return
    }
    signInWithEmailLink(email, href)
      .then(() => setStatus('done'))
      .catch((err) => {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
        const msg = code === 'auth/invalid-action-code' ? 'Link expired or already used.' : err instanceof Error ? err.message : 'Sign-in failed.'
        message.error(msg)
        setStatus('error')
      })
  }, [signInWithEmailLink])

  if (status === 'error') {
    return <Navigate to="/signin" replace />
  }
  if (status === 'done') {
    const from = (location.state as { from?: { pathname: string } })?.from
    return <Navigate to={from?.pathname ?? '/'} replace />
  }

  return (
    <Flex style={{ minHeight: '40vh' }} align="center" justify="center">
      <Spin size="large" aria-label="Loading" />
    </Flex>
  )
}

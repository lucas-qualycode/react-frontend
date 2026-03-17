import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
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
      toast.error('Invalid or expired sign-in link.')
      setStatus('error')
      return
    }
    const email = window.localStorage.getItem(getEmailForSignInKey())
    if (!email) {
      toast.error('Please open the sign-in link from the same device where you requested it.')
      setStatus('error')
      return
    }
    signInWithEmailLink(email, href)
      .then(() => setStatus('done'))
      .catch((err) => {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
        const msg = code === 'auth/invalid-action-code' ? 'Link expired or already used.' : err instanceof Error ? err.message : 'Sign-in failed.'
        toast.error(msg)
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
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-label="Loading" />
    </div>
  )
}

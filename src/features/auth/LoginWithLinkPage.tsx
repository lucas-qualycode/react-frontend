import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth/AuthContext'
import { Button } from '@/shared/components/Button'

function getEmailLinkErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : ''
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  }
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
}

const inputClass =
  'w-full rounded-lg border border-border bg-input px-3 py-2 text-[var(--text)] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-1 block text-sm font-medium text-[var(--text)]'

export function LoginWithLinkPage() {
  const { user, sendSignInLinkToEmail } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from
  const redirectTo = from?.pathname ?? '/'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitting(true)
    setLinkSent(false)
    try {
      await sendSignInLinkToEmail(email.trim())
      setLinkSent(true)
      toast.success('Check your email for the login link.')
    } catch (err) {
      toast.error(getEmailLinkErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-2xl font-semibold text-[var(--text-h)]">Log in with email link</h1>
      {linkSent ? (
        <p className="mt-6 text-[var(--text)]">Link sent. Check your email and click the link to sign in.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="login-link-email" className={labelClass}>
              Email
            </label>
            <input
              id="login-link-email"
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Sending…' : 'Send link'}
          </Button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-center text-sm text-[var(--text)]">
        <Link
          to="/login"
          state={location.state}
          className="font-medium text-primary hover:underline"
        >
          Log in with email and password
        </Link>
        <Link
          to="/login/phone"
          state={location.state}
          className="font-medium text-primary hover:underline"
        >
          Log in with phone
        </Link>
      </div>

      <div className="mt-6 border-t border-border pt-6 text-center text-sm text-[var(--text)]">
        <p>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}

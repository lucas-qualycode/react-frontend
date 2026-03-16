import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import type { OAuthCredential } from 'firebase/auth'
import { useAuth } from '@/app/auth/AuthContext'
import { isAccountExistsDifferentCredentialError } from '@/app/auth/AuthContext'
import { Button } from '@/shared/components/Button'
import { GoogleIcon, EmailLinkIcon, PhoneIcon } from '@/shared/components/icons'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

function getAuthErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : ''
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/popup-blocked': 'Popup was blocked. Allow popups for this site and try again.',
  }
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
}

const inputClass =
  'w-full rounded-lg border border-border bg-input px-3 py-2 text-[var(--text)] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-1 block text-sm font-medium text-[var(--text)]'

type PendingLink = { email: string; credential: OAuthCredential }

export function LoginPage() {
  const { user, signIn, signInWithGoogle, linkWithCredential } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [linkPassword, setLinkPassword] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const from = (location.state as { from?: { pathname: string } })?.from
  const redirectTo = from?.pathname ?? '/'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onSubmit(data: LoginForm) {
    setIsSubmitting(true)
    try {
      await signIn(data.email, data.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast.error(getAuthErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onGoogleClick() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (isAccountExistsDifferentCredentialError(err)) {
        setPendingLink({
          email: (err as { email?: string }).email ?? '',
          credential: (err as { credential?: OAuthCredential }).credential!,
        })
      } else {
        toast.error(getAuthErrorMessage(err))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  async function onLinkAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingLink || !linkPassword.trim()) return
    setLinkLoading(true)
    try {
      await signIn(pendingLink.email, linkPassword)
      await linkWithCredential(pendingLink.credential)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast.error(getAuthErrorMessage(err))
    } finally {
      setLinkLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-2xl font-semibold text-[var(--text-h)]">Log in</h1>
      {pendingLink ? (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-[var(--text)]">
            An account already exists for {pendingLink.email}. Enter your password to link your Google account.
          </p>
          <form onSubmit={onLinkAccountSubmit} className="mt-4 flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="link-email" className={labelClass}>
                Email
              </label>
              <input
                id="link-email"
                type="email"
                value={pendingLink.email}
                readOnly
                className={inputClass + ' bg-muted'}
                aria-readonly
              />
            </div>
            <div>
              <label htmlFor="link-password" className={labelClass}>
                Password
              </label>
              <input
                id="link-password"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                disabled={linkLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={linkLoading} className="mt-2">
                {linkLoading ? 'Linking…' : 'Link account'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPendingLink(null)
                  setLinkPassword('')
                }}
                disabled={linkLoading}
                className="mt-2"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 flex flex-col gap-4"
        noValidate
      >
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-danger">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-center text-sm text-[var(--text)]">
        <Button
          type="button"
          variant="secondary"
          className="flex w-full items-center justify-center gap-2"
          disabled={googleLoading}
          onClick={onGoogleClick}
          aria-busy={googleLoading}
          aria-label={googleLoading ? 'Signing in with Google…' : 'Log in with Google'}
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          <span>{googleLoading ? 'Signing in…' : 'Log in with Google'}</span>
        </Button>
        <Link
          to="/login/link"
          state={location.state}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <EmailLinkIcon className="h-5 w-5 shrink-0" />
          <span>Log in with email link</span>
        </Link>
        <Link
          to="/login/phone"
          state={location.state}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <PhoneIcon className="h-5 w-5 shrink-0" />
          <span>Log in with phone</span>
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
        </>
      )}
    </div>
  )
}

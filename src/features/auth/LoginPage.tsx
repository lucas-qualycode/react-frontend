import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAuth } from '@/app/auth/AuthContext'
import { Button } from '@/shared/components/Button'

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
  }
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
}

const inputClass =
  'w-full rounded-lg border border-border bg-input px-3 py-2 text-[var(--text)] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-1 block text-sm font-medium text-[var(--text)]'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-2xl font-semibold text-[var(--text-h)]">Log in</h1>
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
        <Link
          to="/login/link"
          state={location.state}
          className="font-medium text-primary hover:underline"
        >
          Log in with email link
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

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAuth } from '@/app/auth/AuthContext'
import { Button } from '@/shared/components/Button'

const signUpSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type SignUpForm = z.infer<typeof signUpSchema>

function getSignUpErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  }
  return (
    messages[code] ??
    (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  )
}

const inputClass =
  'w-full rounded-lg border border-border bg-input px-3 py-2 text-[var(--text)] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-1 block text-sm font-medium text-[var(--text)]'

export function SignUpPage() {
  const { user, signUp } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const from = (location.state as { from?: { pathname: string } })?.from
  const redirectTo = from?.pathname ?? '/'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onSignUpSubmit(data: SignUpForm) {
    setIsSubmitting(true)
    try {
      await signUp(data.email, data.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast.error(getSignUpErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-2xl font-semibold text-[var(--text-h)]">Create account</h1>

      <form
        onSubmit={handleSubmit(onSignUpSubmit)}
        className="mt-6 flex flex-col gap-4"
        noValidate
      >
        <div>
          <label htmlFor="signup-email" className={labelClass}>
            Email
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className={labelClass}>
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="signup-confirm" className={labelClass}>
            Confirm password
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-center text-sm text-[var(--text)]">
        <Link
          to="/login/link"
          state={location.state}
          className="font-medium text-primary hover:underline"
        >
          Create account with email link
        </Link>
        <Link
          to="/login/phone"
          state={location.state}
          className="font-medium text-primary hover:underline"
        >
          Create account with phone number
        </Link>
      </div>

      <div className="mt-6 border-t border-border pt-6 text-center text-sm text-[var(--text)]">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

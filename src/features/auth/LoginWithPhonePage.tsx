import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getAuth, RecaptchaVerifier } from 'firebase/auth'
import { useAuth } from '@/app/auth/AuthContext'
import { app } from '@/app/firebase'
import { Button } from '@/shared/components/Button'

function getPhoneErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : ''
  const messages: Record<string, string> = {
    'auth/invalid-phone-number': 'Invalid phone number.',
    'auth/invalid-verification-code': 'Invalid or expired code.',
    'auth/code-expired': 'Code expired. Please request a new one.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  }
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
}

const inputClass =
  'w-full rounded-lg border border-border bg-input px-3 py-2 text-[var(--text)] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-1 block text-sm font-medium text-[var(--text)]'

export function LoginWithPhonePage() {
  const { user, signInWithPhoneNumber } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone')
  const [phoneValue, setPhoneValue] = useState('')
  const [codeValue, setCodeValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<{
    confirm: (code: string) => Promise<unknown>
  } | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  const from = (location.state as { from?: { pathname: string } })?.from
  const redirectTo = from?.pathname ?? '/'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onRequestCode(e: React.FormEvent) {
    e.preventDefault()
    if (!phoneValue.trim() || !recaptchaContainerRef.current) return
    const auth = getAuth(app)
    const verifier = new RecaptchaVerifier(
      auth,
      recaptchaContainerRef.current,
      { size: 'invisible' }
    )
    setIsSubmitting(true)
    try {
      const result = await signInWithPhoneNumber(phoneValue.trim(), verifier)
      setConfirmationResult(result)
      setPhoneStep('code')
    } catch (err) {
      toast.error(getPhoneErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onConfirmCode(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmationResult || !codeValue.trim()) return
    setIsSubmitting(true)
    try {
      await confirmationResult.confirm(codeValue.trim())
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast.error(getPhoneErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="text-2xl font-semibold text-[var(--text-h)]">Log in with phone number</h1>
      <div ref={recaptchaContainerRef} />
      {phoneStep === 'phone' ? (
        <form onSubmit={onRequestCode} className="mt-6 flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="login-phone" className={labelClass}>
              Phone number
            </label>
            <input
              id="login-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 234 567 8900"
              className={inputClass}
              value={phoneValue}
              onChange={(e) => setPhoneValue(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={onConfirmCode} className="mt-6 flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="login-phone-code" className={labelClass}>
              Verification code
            </label>
            <input
              id="login-phone-code"
              type="text"
              placeholder="Enter code"
              className={inputClass}
              value={codeValue}
              onChange={(e) => setCodeValue(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Verifying…' : 'Verify'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPhoneStep('phone')
                setConfirmationResult(null)
                setCodeValue('')
              }}
              disabled={isSubmitting}
              className="mt-2"
            >
              Back
            </Button>
          </div>
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
          to="/login/link"
          state={location.state}
          className="font-medium text-primary hover:underline"
        >
          Log in with email link
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

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Divider, Form, Input, Layout, message, Space, Typography } from 'antd'
import { z } from 'zod'
import type { OAuthCredential } from 'firebase/auth'
import { useAuth } from '@/app/auth/AuthContext'
import { isAccountExistsDifferentCredentialError } from '@/app/auth/AuthContext'
import { AuthFooterLink } from '@/features/auth/AuthFooterLink'
import { GoogleIcon, EmailLinkIcon, PhoneIcon } from '@/shared/components/icons'

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

type SignUpFormValues = z.infer<typeof signUpSchema>

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
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/popup-blocked': 'Popup was blocked. Allow popups for this site and try again.',
  }
  return (
    messages[code] ??
    (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  )
}

type PendingLink = { email: string; credential: OAuthCredential }

export function SignUpPage() {
  const { user, signUp, signInWithGoogle, signIn, linkWithCredential } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form] = Form.useForm<SignUpFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [linkPassword, setLinkPassword] = useState('')

  const from = (location.state as { from?: { pathname: string } })?.from
  const redirectTo = from?.pathname ?? '/'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onFinish(values: SignUpFormValues) {
    setIsSubmitting(true)
    try {
      await signUp(values.email, values.password)
      message.success(
        `You're signed up. We sent a verification email to ${values.email}. Please verify so you can link Google or other sign-in methods later.`
      )
      navigate(redirectTo, { replace: true })
    } catch (err) {
      message.error(getSignUpErrorMessage(err))
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
        message.error(getSignUpErrorMessage(err))
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
      message.error(getSignUpErrorMessage(err))
    } finally {
      setLinkLoading(false)
    }
  }

  const { Content } = Layout
  const { Title, Text } = Typography
  return (
    <Content style={{ padding: 32, maxWidth: 384, margin: '0 auto', width: '100%' }}>
      <Title level={2}>Sign up</Title>
      {pendingLink ? (
        <Card style={{ marginTop: 24 }}>
          <Alert
            message={`An account already exists for ${pendingLink.email}. Enter your password to link your Google account.`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <form onSubmit={onLinkAccountSubmit}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Form.Item label="Email">
                <Input value={pendingLink.email} readOnly disabled />
              </Form.Item>
              <Form.Item label="Password">
                <Input.Password
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  disabled={linkLoading}
                  autoComplete="current-password"
                />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={linkLoading}>
                  Link account
                </Button>
                <Button
                  type="text"
                  disabled={linkLoading}
                  onClick={() => {
                    setPendingLink(null)
                    setLinkPassword('')
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Space>
          </form>
        </Card>
      ) : (
        <>
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: 24 }}
            onFinish={(values) => {
              const parsed = signUpSchema.safeParse(values)
              if (parsed.success) onFinish(parsed.data)
              else form.setFields(parsed.error.issues.map((issue) => ({ name: issue.path[0] as 'email' | 'password' | 'confirmPassword', errors: [issue.message] })))
            }}
          >
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}>
              <Input autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required' }, { min: 6, message: 'Password must be at least 6 characters' }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve()
                    return Promise.reject(new Error('Passwords do not match.'))
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item style={{ marginTop: 24 }}>
              <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                Sign up
              </Button>
            </Form.Item>
          </Form>

          <Divider />
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button
              type="default"
              block
              loading={googleLoading}
              onClick={onGoogleClick}
              aria-label={googleLoading ? 'Signing up with Google…' : 'Sign up with Google'}
              icon={<GoogleIcon />}
            >
              Sign up with Google
            </Button>
            <Link to="/signin/link" state={location.state} style={{ display: 'block' }}>
              <Button type="default" block icon={<EmailLinkIcon />}>
                Sign up with email link
              </Button>
            </Link>
            <Link to="/signin/phone" state={location.state} style={{ display: 'block' }}>
              <Button type="default" block icon={<PhoneIcon />}>
                Sign up with phone number
              </Button>
            </Link>
          </Space>

          <Divider />
          <Text style={{ display: 'block', textAlign: 'center' }}>
            Already have an account? <AuthFooterLink to="/signin">Sign in</AuthFooterLink>
          </Text>
        </>
      )}
    </Content>
  )
}

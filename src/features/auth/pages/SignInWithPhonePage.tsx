import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { getAuth, RecaptchaVerifier } from 'firebase/auth'
import type { OAuthCredential } from 'firebase/auth'
import { Alert, Button, Card, Divider, Form, Input, Layout, Space, Typography } from 'antd'
import { useAuth } from '@/app/auth/AuthContext'
import { isAccountExistsDifferentCredentialError } from '@/app/auth/AuthContext'
import { app } from '@/app/firebase'
import { AuthFooterLink } from '../AuthFooterLink'
import { GoogleOutlined, MailOutlined } from '@ant-design/icons'

type PendingLink = { email: string; credential: OAuthCredential }

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
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/popup-blocked': 'Popup was blocked. Allow popups for this site and try again.',
  }
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
}

export function SignInWithPhonePage() {
  const { user, signInWithPhoneNumber, signInWithGoogle, signIn, linkWithCredential } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone')
  const [phoneForm] = Form.useForm<{ phone: string }>()
  const [codeValue, setCodeValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<{
    confirm: (code: string) => Promise<unknown>
  } | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [linkPassword, setLinkPassword] = useState('')

  const from = (location.state as { from?: { pathname: string } })?.from
  const redirectTo = from?.pathname ?? '/'

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
        message.error(getPhoneErrorMessage(err))
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
      message.error(getPhoneErrorMessage(err))
    } finally {
      setLinkLoading(false)
    }
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onRequestCodeFinish(values: { phone: string }) {
    if (!recaptchaContainerRef.current) return
    const auth = getAuth(app)
    const verifier = new RecaptchaVerifier(
      auth,
      recaptchaContainerRef.current,
      { size: 'invisible' }
    )
    setIsSubmitting(true)
    try {
      const result = await signInWithPhoneNumber(values.phone.trim(), verifier)
      setConfirmationResult(result)
      setPhoneStep('code')
    } catch (err) {
      message.error(getPhoneErrorMessage(err))
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
      message.error(getPhoneErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const { Content } = Layout
  const { Title, Text } = Typography
  return (
    <Content style={{ padding: 32, maxWidth: 384, margin: '0 auto', width: '100%' }}>
      <Title level={2}>Sign in with phone number</Title>
      {pendingLink ? (
        <Card style={{ marginTop: 24 }}>
          <Alert
            message={`An account already exists for ${pendingLink.email}. Enter your password to link your Google account.`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form layout="vertical">
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
              <Button type="primary" htmlType="button" loading={linkLoading} onClick={(e) => { e.preventDefault(); onLinkAccountSubmit(e) }}>
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
          </Form>
        </Card>
      ) : (
        <>
          <div ref={recaptchaContainerRef} />
          {phoneStep === 'phone' ? (
            <Form form={phoneForm} layout="vertical" style={{ marginTop: 24 }} onFinish={onRequestCodeFinish}>
              <Form.Item name="phone" label="Phone number" rules={[{ required: true, message: 'Phone number is required' }]}>
                <Input type="tel" autoComplete="tel" placeholder="+1 234 567 8900" disabled={isSubmitting} />
              </Form.Item>
              <Form.Item style={{ marginTop: 35 }}>
                <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                  Send code
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form layout="vertical" style={{ marginTop: 24 }}>
              <Form.Item label="Verification code">
                <Input
                  placeholder="Enter code"
                  value={codeValue}
                  onChange={(e) => setCodeValue(e.target.value)}
                  disabled={isSubmitting}
                />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="button" loading={isSubmitting} onClick={(e) => { e.preventDefault(); onConfirmCode(e) }}>
                  Verify
                </Button>
                <Button
                  type="text"
                  disabled={isSubmitting}
                  onClick={() => {
                    setPhoneStep('phone')
                    setConfirmationResult(null)
                    setCodeValue('')
                  }}
                >
                  Back
                </Button>
              </Space>
            </Form>
          )}

          <Divider />
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button
              type="default"
              block
              loading={googleLoading}
              onClick={onGoogleClick}
              aria-label={googleLoading ? 'Signing in with Google…' : 'Sign in with Google'}
              icon={<GoogleOutlined style={{ fontSize: 20 }} />}
            >
              Sign in with Google
            </Button>
            <Button
              type="default"
              block
              icon={<MailOutlined style={{ fontSize: 20 }} />}
              onClick={() => navigate('/signin', { state: location.state })}
            >
              Sign in with email and password
            </Button>
            <Button
              type="default"
              block
              icon={<MailOutlined style={{ fontSize: 20 }} />}
              onClick={() => navigate('/signin/link', { state: location.state })}
            >
              Sign in with email link
            </Button>
          </Space>

          <Divider />
          <Text style={{ display: 'block', textAlign: 'center' }}>
            Don&apos;t have an account? <AuthFooterLink to="/signup">Sign up</AuthFooterLink>
          </Text>
        </>
      )}
    </Content>
  )
}

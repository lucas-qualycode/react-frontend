import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { message } from 'antd'
import type { OAuthCredential } from 'firebase/auth'
import { Alert, Button, Card, Divider, Form, Input, Layout, Space, Typography } from 'antd'
import { useAuth } from '@/app/auth/AuthContext'
import { isAccountExistsDifferentCredentialError } from '@/app/auth/AuthContext'
import { AuthFooterLink } from '../AuthFooterLink'
import { GoogleOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'

type PendingLink = { email: string; credential: OAuthCredential }

function getEmailLinkErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : ''
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/popup-blocked': 'Popup was blocked. Allow popups for this site and try again.',
  }
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
}

export function SignInWithLinkPage() {
  const { user, sendSignInLinkToEmail, signInWithGoogle, signIn, linkWithCredential } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sendLinkForm] = Form.useForm<{ email: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
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
        message.error(getEmailLinkErrorMessage(err))
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
      message.error(getEmailLinkErrorMessage(err))
    } finally {
      setLinkLoading(false)
    }
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onSendLinkFinish(values: { email: string }) {
    setIsSubmitting(true)
    setLinkSent(false)
    try {
      await sendSignInLinkToEmail(values.email.trim())
      setLinkSent(true)
      message.success('Check your email for the sign-in link.')
    } catch (err) {
      message.error(getEmailLinkErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const { Content } = Layout
  const { Title, Text } = Typography
  return (
    <Content style={{ padding: 32, maxWidth: 384, margin: '0 auto', width: '100%' }}>
      <Title level={2}>Sign in with email link</Title>
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
      ) : linkSent ? (
        <Text style={{ display: 'block', marginTop: 24 }}>Link sent. Check your email and click the link to sign in.</Text>
      ) : (
        <Form form={sendLinkForm} layout="vertical" style={{ marginTop: 24 }} onFinish={onSendLinkFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}>
            <Input type="email" autoComplete="email" disabled={isSubmitting} />
          </Form.Item>
          <Form.Item style={{ marginTop: 35 }}>
            <Button type="primary" htmlType="submit" loading={isSubmitting} block>
              Send link
            </Button>
          </Form.Item>
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
          icon={<PhoneOutlined style={{ fontSize: 20 }} />}
          onClick={() => navigate('/signin/phone', { state: location.state })}
        >
          Sign in with phone
        </Button>
      </Space>

      <Divider />
      <Text style={{ display: 'block', textAlign: 'center' }}>
        Don&apos;t have an account? <AuthFooterLink to="/signup">Sign up</AuthFooterLink>
      </Text>
    </Content>
  )
}

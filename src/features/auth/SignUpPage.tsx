import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Divider, Form, Input, Layout, message, Space, Typography } from 'antd'
import { z } from 'zod'
import type { OAuthCredential } from 'firebase/auth'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthContext'
import { isAccountExistsDifferentCredentialError } from '@/app/auth/AuthContext'
import { AuthFooterLink } from '@/features/auth/AuthFooterLink'
import { GoogleOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'

function buildSignUpSchema(t: (key: string) => string) {
  return z
    .object({
      email: z.string().min(1, t('auth.validation.emailRequired')).email(t('auth.validation.emailInvalid')),
      password: z.string().min(6, t('auth.validation.passwordMin')),
      confirmPassword: z.string().min(1, t('auth.signUp.confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.signUp.passwordsMismatch'),
      path: ['confirmPassword'],
    })
}

type SignUpFormValues = z.infer<ReturnType<typeof buildSignUpSchema>>

function getSignUpErrorMessage(err: unknown, t: (key: string) => string): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': t('auth.signUp.errors.emailInUse'),
    'auth/invalid-email': t('auth.errors.invalidEmail'),
    'auth/weak-password': t('auth.signUp.errors.weakPassword'),
    'auth/too-many-requests': t('auth.errors.tooManyRequests'),
    'auth/network-request-failed': t('auth.errors.network'),
    'auth/popup-closed-by-user': t('auth.errors.popupClosed'),
    'auth/popup-blocked': t('auth.errors.popupBlocked'),
  }
  return messages[code] ?? (err instanceof Error ? err.message : t('auth.signUp.errors.generic'))
}

type PendingLink = { email: string; credential: OAuthCredential }

export function SignUpPage() {
  const { t } = useTranslation()
  const { user, signUp, signInWithGoogle, signIn, linkWithCredential } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form] = Form.useForm<SignUpFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [linkPassword, setLinkPassword] = useState('')

  const signUpSchema = useMemo(() => buildSignUpSchema(t), [t])

  const from = (location.state as { from?: { pathname: string } })?.from
  const redirectTo = from?.pathname ?? '/'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function onFinish(values: SignUpFormValues) {
    setIsSubmitting(true)
    try {
      await signUp(values.email, values.password)
      message.success(t('auth.signUp.success', { email: values.email }))
      navigate(redirectTo, { replace: true })
    } catch (err) {
      message.error(getSignUpErrorMessage(err, t))
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
        message.error(getSignUpErrorMessage(err, t))
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
      message.error(getSignUpErrorMessage(err, t))
    } finally {
      setLinkLoading(false)
    }
  }

  const { Content } = Layout
  const { Title, Text } = Typography
  return (
    <Content style={{ padding: 32, maxWidth: 384, margin: '0 auto', width: '100%' }}>
      <Title level={2}>{t('auth.signUp.title')}</Title>
      {pendingLink ? (
        <Card style={{ marginTop: 24 }}>
          <Alert
            message={t('auth.signIn.linkAlert', { email: pendingLink.email })}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <form onSubmit={onLinkAccountSubmit}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Form.Item label={t('auth.signIn.email')}>
                <Input value={pendingLink.email} readOnly disabled />
              </Form.Item>
              <Form.Item label={t('auth.signIn.password')}>
                <Input.Password
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  disabled={linkLoading}
                  autoComplete="current-password"
                />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={linkLoading}>
                  {t('auth.signIn.linkSubmit')}
                </Button>
                <Button
                  type="text"
                  disabled={linkLoading}
                  onClick={() => {
                    setPendingLink(null)
                    setLinkPassword('')
                  }}
                >
                  {t('auth.signIn.cancel')}
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
              else
                form.setFields(
                  parsed.error.issues.map((issue) => ({
                    name: issue.path[0] as 'email' | 'password' | 'confirmPassword',
                    errors: [issue.message],
                  }))
                )
            }}
          >
            <Form.Item
              name="email"
              label={t('auth.signIn.email')}
              rules={[
                { required: true, message: t('auth.validation.emailRequired') },
                { type: 'email', message: t('auth.validation.emailInvalid') },
              ]}
            >
              <Input autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="password"
              label={t('auth.signIn.password')}
              rules={[
                { required: true, message: t('auth.signUp.passwordRequired') },
                { min: 6, message: t('auth.validation.passwordMin') },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label={t('auth.signUp.confirmPassword')}
              dependencies={['password']}
              rules={[
                { required: true, message: t('auth.signUp.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve()
                    return Promise.reject(new Error(t('auth.signUp.passwordsMismatch')))
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item style={{ marginTop: 24 }}>
              <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                {t('auth.signUp.submit')}
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
              aria-label={googleLoading ? t('auth.signUp.googleAriaLoading') : t('auth.signUp.googleAria')}
              icon={<GoogleOutlined style={{ fontSize: 20 }} />}
            >
              {t('auth.signUp.google')}
            </Button>
            <Link to="/signin/link" state={location.state} style={{ display: 'block' }}>
              <Button type="default" block icon={<MailOutlined style={{ fontSize: 20 }} />}>
                {t('auth.signUp.emailLink')}
              </Button>
            </Link>
            <Link to="/signin/phone" state={location.state} style={{ display: 'block' }}>
              <Button type="default" block icon={<PhoneOutlined style={{ fontSize: 20 }} />}>
                {t('auth.signUp.phone')}
              </Button>
            </Link>
          </Space>

          <Divider />
          <Text style={{ display: 'block', textAlign: 'center' }}>
            {t('auth.signUp.hasAccount')}{' '}
            <AuthFooterLink to="/signin">{t('auth.signUp.signInLink')}</AuthFooterLink>
          </Text>
        </>
      )}
    </Content>
  )
}

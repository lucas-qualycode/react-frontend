import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Input,
  message,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'
import { securityAuthErrorMessage } from '@/features/settings/utils/securityAuthErrorMessage'

const { Text } = Typography

type SecurityEmailFormValues = {
  newEmail: string
  currentPassword: string
}

type SecurityPasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function SecuritySettingsSection() {
  const navigate = useNavigate()
  const {
    user,
    updateEmailWithPassword,
    updatePasswordWithPassword,
    revokeAllSessions,
    signOut,
    sendVerificationEmail,
    modalApi,
  } = useOutletContext<SettingsOutletContext>()
  const [securityEmailForm] = Form.useForm<SecurityEmailFormValues>()
  const [securityPasswordForm] = Form.useForm<SecurityPasswordFormValues>()
  const [signOutEverywhereLoading, setSignOutEverywhereLoading] = useState(false)
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const hasPasswordProvider =
    user?.providerData?.some((p) => p.providerId === 'password') ?? false

  async function onFinishSecurityEmail(values: SecurityEmailFormValues) {
    if (!user?.email) return
    const next = values.newEmail.trim()
    if (next.toLowerCase() === user.email.toLowerCase()) {
      message.info('That is already your email.')
      return
    }
    modalApi.confirm({
      title: 'Change email?',
      content:
        'We will send a link to the new address. Your sign-in email stays the same until you open that link and confirm. After that, your profile syncs automatically.',
      okText: 'Send verification',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await updateEmailWithPassword(next, values.currentPassword)
          securityEmailForm.resetFields(['newEmail', 'currentPassword'])
          message.success(
            'Check the new inbox for a verification link. The change completes only after you open it.'
          )
        } catch (err) {
          message.error(securityAuthErrorMessage(err))
          throw err
        }
      },
    })
  }

  async function onFinishSecurityPassword(values: SecurityPasswordFormValues) {
    setPasswordSaving(true)
    try {
      await updatePasswordWithPassword(values.currentPassword, values.newPassword)
      securityPasswordForm.resetFields()
      message.success('Password updated.')
    } catch (err) {
      message.error(securityAuthErrorMessage(err))
    } finally {
      setPasswordSaving(false)
    }
  }

  function requestSignOutEverywhere() {
    modalApi.confirm({
      title: 'Sign out everywhere?',
      content:
        'This will invalidate other sessions. You will need to sign in again on this device.',
      okText: 'Sign out everywhere',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setSignOutEverywhereLoading(true)
        try {
          await revokeAllSessions()
          await signOut()
          navigate('/signin', { replace: true })
        } catch (err) {
          message.error(securityAuthErrorMessage(err))
          throw err
        } finally {
          setSignOutEverywhereLoading(false)
        }
      },
    })
  }

  async function handleResendVerification() {
    setResendVerificationLoading(true)
    try {
      await sendVerificationEmail()
      message.success('Verification email sent. Check your inbox.')
    } catch (err) {
      message.error(securityAuthErrorMessage(err))
    } finally {
      setResendVerificationLoading(false)
    }
  }

  return (
    <Flex vertical gap={24}>
      <Card title="Email">
        <Flex vertical gap={16}>
          <div>
            <Text type="secondary">Signed in as </Text>
            <Text strong>{user?.email ?? '—'}</Text>
            {user && (
              <Tag color={user.emailVerified ? 'success' : 'warning'} style={{ marginLeft: 8 }}>
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </Tag>
            )}
          </div>
          {user?.email && !user.emailVerified && (
            <Flex align="center" gap={12} wrap="wrap">
              <Text type="secondary">Confirm your email to secure your account.</Text>
              <Button
                type="default"
                loading={resendVerificationLoading}
                disabled={resendVerificationLoading}
                onClick={handleResendVerification}
              >
                Resend verification email
              </Button>
            </Flex>
          )}
          {!hasPasswordProvider && (
            <Alert
              type="info"
              showIcon
              message="Email and password changes require an email/password sign-in method on this account."
            />
          )}
          <Flex vertical gap={16} style={{ width: '100%' }}>
            <Form
              id="settings-security-email"
              form={securityEmailForm}
              layout="vertical"
              onFinish={onFinishSecurityEmail}
              style={{ width: '100%' }}
            >
              <div style={{ maxWidth: 400 }}>
                <Form.Item
                  name="newEmail"
                  label="New email"
                  rules={[
                    { required: true, message: 'Enter a new email' },
                    { type: 'email', message: 'Invalid email' },
                  ]}
                >
                  <Input autoComplete="email" disabled={!hasPasswordProvider} />
                </Form.Item>
                <Form.Item
                  name="currentPassword"
                  label="Current password"
                  rules={[{ required: true, message: 'Enter your current password' }]}
                >
                  <Input.Password autoComplete="current-password" disabled={!hasPasswordProvider} />
                </Form.Item>
              </div>
            </Form>
            <Flex justify="flex-end" style={{ width: '100%' }}>
              <Button
                type="primary"
                htmlType="submit"
                form="settings-security-email"
                disabled={!hasPasswordProvider}
              >
                Change email
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>
      <Card title="Password">
        {!hasPasswordProvider && (
          <Alert
            type="info"
            showIcon
            message="Password change is only available when you sign in with email and password."
            style={{ marginBottom: 16 }}
          />
        )}
        <Flex vertical gap={16} style={{ width: '100%' }}>
          <Form
            id="settings-security-password"
            form={securityPasswordForm}
            layout="vertical"
            onFinish={onFinishSecurityPassword}
            style={{ width: '100%' }}
          >
            <div style={{ maxWidth: 400 }}>
              <Form.Item
                name="currentPassword"
                label="Current password"
                rules={[{ required: true, message: 'Enter your current password' }]}
              >
                <Input.Password autoComplete="current-password" disabled={!hasPasswordProvider} />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label="New password"
                rules={[
                  { required: true, message: 'Enter a new password' },
                  { min: 6, message: 'At least 6 characters' },
                ]}
              >
                <Input.Password autoComplete="new-password" disabled={!hasPasswordProvider} />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirm new password"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject(new Error('Passwords do not match.'))
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" disabled={!hasPasswordProvider} />
              </Form.Item>
            </div>
          </Form>
          <Flex justify="flex-end" style={{ width: '100%' }}>
            <Button
              type="primary"
              htmlType="submit"
              form="settings-security-password"
              disabled={!hasPasswordProvider}
              loading={passwordSaving}
            >
              Update password
            </Button>
          </Flex>
        </Flex>
      </Card>
      <Card title="Two-factor authentication">
        <Flex vertical gap={12}>
          <Text type="secondary">Extra verification for your account.</Text>
          <Flex align="center" gap={12}>
            <Text>Authenticator app</Text>
            <Switch disabled checked={false} />
          </Flex>
          <Text type="secondary">Coming soon.</Text>
        </Flex>
      </Card>
      <Card title="Sessions">
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Sign out on all devices and invalidate existing sessions.
        </Text>
        <Flex justify="flex-end">
          <Button danger loading={signOutEverywhereLoading} onClick={requestSignOutEverywhere}>
            Sign out everywhere
          </Button>
        </Flex>
      </Card>
    </Flex>
  )
}

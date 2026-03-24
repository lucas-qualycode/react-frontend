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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      message.info(t('settings.security.alreadyThatEmail'))
      return
    }
    modalApi.confirm({
      title: t('settings.security.changeEmailModalTitle'),
      content: t('settings.security.changeEmailModalBody'),
      okText: t('settings.security.sendVerification'),
      cancelText: t('auth.signIn.cancel'),
      onOk: async () => {
        try {
          await updateEmailWithPassword(next, values.currentPassword)
          securityEmailForm.resetFields(['newEmail', 'currentPassword'])
          message.success(t('settings.security.emailChangeSuccess'))
        } catch (err) {
          message.error(securityAuthErrorMessage(err, t))
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
      message.success(t('settings.security.passwordUpdated'))
    } catch (err) {
      message.error(securityAuthErrorMessage(err, t))
    } finally {
      setPasswordSaving(false)
    }
  }

  function requestSignOutEverywhere() {
    modalApi.confirm({
      title: t('settings.security.signOutEverywhereModalTitle'),
      content: t('settings.security.signOutEverywhereModalBody'),
      okText: t('settings.security.signOutEverywhereOk'),
      okType: 'danger',
      cancelText: t('auth.signIn.cancel'),
      onOk: async () => {
        setSignOutEverywhereLoading(true)
        try {
          await revokeAllSessions()
          await signOut()
          navigate('/signin', { replace: true })
        } catch (err) {
          message.error(securityAuthErrorMessage(err, t))
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
      message.success(t('settings.security.verificationSent'))
    } catch (err) {
      message.error(securityAuthErrorMessage(err, t))
    } finally {
      setResendVerificationLoading(false)
    }
  }

  return (
    <Flex vertical gap={24}>
      <Card title={t('settings.security.emailCard')}>
        <Flex vertical gap={16}>
          <div>
            <Text type="secondary">{t('settings.security.signedInAs')} </Text>
            <Text strong>{user?.email ?? '—'}</Text>
            {user && (
              <Tag color={user.emailVerified ? 'success' : 'warning'} style={{ marginLeft: 8 }}>
                {user.emailVerified ? t('settings.security.verified') : t('settings.security.unverified')}
              </Tag>
            )}
          </div>
          {user?.email && !user.emailVerified && (
            <Flex align="center" gap={12} wrap="wrap">
              <Text type="secondary">{t('settings.security.confirmEmailHint')}</Text>
              <Button
                type="default"
                loading={resendVerificationLoading}
                disabled={resendVerificationLoading}
                onClick={handleResendVerification}
              >
                {t('settings.security.resendVerification')}
              </Button>
            </Flex>
          )}
          {!hasPasswordProvider && (
            <Alert
              type="info"
              showIcon
              message={t('settings.security.passwordProviderRequired')}
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
                  label={t('settings.security.newEmail')}
                  rules={[
                    { required: true, message: t('settings.security.enterNewEmail') },
                    { type: 'email', message: t('auth.validation.emailInvalid') },
                  ]}
                >
                  <Input autoComplete="email" disabled={!hasPasswordProvider} />
                </Form.Item>
                <Form.Item
                  name="currentPassword"
                  label={t('settings.security.currentPassword')}
                  rules={[{ required: true, message: t('settings.security.enterCurrentPassword') }]}
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
                {t('settings.security.changeEmail')}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>
      <Card title={t('settings.security.passwordCard')}>
        {!hasPasswordProvider && (
          <Alert
            type="info"
            showIcon
            message={t('settings.security.passwordChangeGoogleOnly')}
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
                label={t('settings.security.currentPassword')}
                rules={[{ required: true, message: t('settings.security.enterCurrentPassword') }]}
              >
                <Input.Password autoComplete="current-password" disabled={!hasPasswordProvider} />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label={t('settings.security.newPassword')}
                rules={[
                  { required: true, message: t('settings.security.enterNewPassword') },
                  { min: 6, message: t('settings.security.atLeast6') },
                ]}
              >
                <Input.Password autoComplete="new-password" disabled={!hasPasswordProvider} />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label={t('settings.security.confirmNewPassword')}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('settings.security.confirmNewPasswordRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject(new Error(t('auth.signUp.passwordsMismatch')))
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
              {t('settings.security.updatePassword')}
            </Button>
          </Flex>
        </Flex>
      </Card>
      <Card title={t('settings.security.twoFactorCard')}>
        <Flex vertical gap={12}>
          <Text type="secondary">{t('settings.security.twoFactorHint')}</Text>
          <Flex align="center" gap={12}>
            <Text>{t('settings.security.authenticatorApp')}</Text>
            <Switch disabled checked={false} />
          </Flex>
          <Text type="secondary">{t('settings.security.comingSoon')}</Text>
        </Flex>
      </Card>
      <Card title={t('settings.security.sessionsCard')}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {t('settings.security.sessionsHint')}
        </Text>
        <Flex justify="flex-end">
          <Button danger loading={signOutEverywhereLoading} onClick={requestSignOutEverywhere}>
            {t('settings.security.signOutEverywhere')}
          </Button>
        </Flex>
      </Card>
    </Flex>
  )
}

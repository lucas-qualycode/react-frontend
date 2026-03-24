import { useEffect, useState } from 'react'
import { Button, Card, Form, Switch, message } from 'antd'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'

type NotificationsFormValues = {
  notifications: boolean
}

export function NotificationsSettingsSection() {
  const { t } = useTranslation()
  const { profile, updateMutation } = useOutletContext<SettingsOutletContext>()
  const [notificationsForm] = Form.useForm<NotificationsFormValues>()
  const [notificationsSaving, setNotificationsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      notificationsForm.setFieldsValue({ notifications: profile.preferences.notifications })
    }
  }, [profile, notificationsForm])

  async function onFinish(values: NotificationsFormValues) {
    if (!profile) return
    setNotificationsSaving(true)
    try {
      await updateMutation.mutateAsync({
        preferences: {
          notifications: values.notifications,
          language: profile.preferences.language,
          timezone: profile.preferences.timezone,
        },
      })
      message.success(t('settings.notifications.saved'))
    } catch {
      message.error(t('settings.saveError'))
    } finally {
      setNotificationsSaving(false)
    }
  }

  return (
    <Card title={t('settings.notifications.cardTitle')}>
      <Form
        form={notificationsForm}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ notifications: true }}
      >
        <Form.Item
          name="notifications"
          label={t('settings.notifications.switchLabel')}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" htmlType="submit" loading={notificationsSaving}>
            {t('settings.save')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

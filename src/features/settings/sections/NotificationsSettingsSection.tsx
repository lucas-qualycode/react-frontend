import { useEffect, useState } from 'react'
import { Button, Card, Form, Switch, message } from 'antd'
import { useOutletContext } from 'react-router-dom'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'

type NotificationsFormValues = {
  notifications: boolean
}

export function NotificationsSettingsSection() {
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
      message.success('Notifications saved.')
    } catch {
      message.error('Could not save. Please try again.')
    } finally {
      setNotificationsSaving(false)
    }
  }

  return (
    <Card title="Notifications">
      <Form
        form={notificationsForm}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ notifications: true }}
      >
        <Form.Item
          name="notifications"
          label="Email and in-app notifications"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" htmlType="submit" loading={notificationsSaving}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

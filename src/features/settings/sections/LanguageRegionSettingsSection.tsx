import { useEffect } from 'react'
import { Button, Card, Form, Select, message } from 'antd'
import { useOutletContext } from 'react-router-dom'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'

type LanguageFormValues = {
  language: string
  timezone: string
}

export function LanguageRegionSettingsSection() {
  const { profile, updateMutation } = useOutletContext<SettingsOutletContext>()
  const [languageForm] = Form.useForm<LanguageFormValues>()

  useEffect(() => {
    if (profile) {
      languageForm.setFieldsValue({
        language: profile.preferences.language,
        timezone: profile.preferences.timezone,
      })
    }
  }, [profile, languageForm])

  async function onFinish(values: LanguageFormValues) {
    if (!profile) return
    try {
      await updateMutation.mutateAsync({
        preferences: {
          notifications: profile.preferences.notifications,
          language: values.language,
          timezone: values.timezone,
        },
      })
      message.success('Language & region saved.')
    } catch {
      message.error('Could not save. Please try again.')
    }
  }

  return (
    <Card title="Language & region">
      <Form
        form={languageForm}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ language: 'pt-BR', timezone: 'UTC-3' }}
      >
        <Form.Item name="language" label="Language">
          <Select
            options={[
              { value: 'pt-BR', label: 'Portuguese (Brazil)' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Form.Item>
        <Form.Item name="timezone" label="Timezone">
          <Select
            options={[
              { value: 'UTC-3', label: 'UTC-3 (Brasília)' },
              { value: 'UTC', label: 'UTC' },
            ]}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

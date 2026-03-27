import { useEffect, useState } from 'react'
import { Button, Card, Form, Select, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useSettingsOutletContext } from '@/features/settings/SettingsLayoutOutletContext'

type LanguageFormValues = {
  language: string
  timezone: string
}

export function LanguageRegionSettingsSection() {
  const { t, i18n } = useTranslation()
  const { profile, updateMutation } = useSettingsOutletContext()
  const [languageForm] = Form.useForm<LanguageFormValues>()
  const [languageSaving, setLanguageSaving] = useState(false)

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
    setLanguageSaving(true)
    try {
      await updateMutation.mutateAsync({
        preferences: {
          notifications: profile.preferences.notifications,
          language: values.language,
          timezone: values.timezone,
        },
      })
      if (values.language === 'pt-BR' || values.language === 'en') {
        void i18n.changeLanguage(values.language)
      }
      message.success(t('settings.language.saved'))
    } catch {
      message.error(t('settings.saveError'))
    } finally {
      setLanguageSaving(false)
    }
  }

  return (
    <Card title={t('settings.language.cardTitle')}>
      <Form
        form={languageForm}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ language: 'pt-BR', timezone: 'UTC-3' }}
      >
        <Form.Item name="language" label={t('settings.language.languageLabel')}>
          <Select
            options={[
              { value: 'pt-BR', label: t('settings.language.options.ptBR') },
              { value: 'en', label: t('settings.language.options.en') },
            ]}
          />
        </Form.Item>
        <Form.Item name="timezone" label={t('settings.language.timezoneLabel')}>
          <Select
            options={[
              { value: 'UTC-3', label: t('settings.language.timezones.utcMinus3') },
              { value: 'UTC', label: t('settings.language.timezones.utc') },
            ]}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" htmlType="submit" loading={languageSaving}>
            {t('settings.save')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

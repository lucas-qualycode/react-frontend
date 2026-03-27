import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, Flex, Form, Segmented, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useSettingsOutletContext } from '@/features/settings/SettingsLayoutOutletContext'
import {
  mergeAppearancePreferences,
  saveAppearanceToStorage,
} from '@/app/appearance/mergeAppearancePreferences'
import type {
  DensityPref,
  FontSizePref,
  ReducedMotionPref,
  ThemeMode,
  UserProfile,
} from '@/features/settings/types'

type AppearanceFormValues = {
  themeMode: ThemeMode
  density: DensityPref
  fontSize: FontSizePref
  reducedMotion: ReducedMotionPref
}

const DEBOUNCE_MS = 450

function appearanceEqual(a: AppearanceFormValues, b: AppearanceFormValues) {
  return (
    a.themeMode === b.themeMode &&
    a.density === b.density &&
    a.fontSize === b.fontSize &&
    a.reducedMotion === b.reducedMotion
  )
}

function valuesFromProfile(profile: UserProfile): AppearanceFormValues {
  const m = mergeAppearancePreferences(profile.preferences)
  return {
    themeMode: m.themeMode,
    density: m.density,
    fontSize: m.fontSize,
    reducedMotion: m.reducedMotion,
  }
}

export function AppearanceSettingsSection() {
  const { t } = useTranslation()
  const { profile, updateMutation } = useSettingsOutletContext()
  const [form] = Form.useForm<AppearanceFormValues>()
  const [saving, setSaving] = useState(false)
  const skipAutoSaveRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const themeOptions = useMemo(
    () => [
      { label: t('settings.appearance.themeOptions.system'), value: 'system' as const },
      { label: t('settings.appearance.themeOptions.light'), value: 'light' as const },
      { label: t('settings.appearance.themeOptions.dark'), value: 'dark' as const },
    ],
    [t]
  )

  const densityOptions = useMemo(
    () => [
      { label: t('settings.appearance.densityOptions.compact'), value: 'compact' as const },
      { label: t('settings.appearance.densityOptions.default'), value: 'default' as const },
      { label: t('settings.appearance.densityOptions.comfortable'), value: 'comfortable' as const },
    ],
    [t]
  )

  const fontSizeOptions = useMemo(
    () => [
      { label: t('settings.appearance.fontSizeOptions.standard'), value: 'standard' as const },
      { label: t('settings.appearance.fontSizeOptions.large'), value: 'large' as const },
    ],
    [t]
  )

  const motionOptions = useMemo(
    () => [
      { label: t('settings.appearance.motionOptions.system'), value: 'system' as const },
      { label: t('settings.appearance.motionOptions.reduce'), value: 'reduce' as const },
      { label: t('settings.appearance.motionOptions.full'), value: 'full' as const },
    ],
    [t]
  )

  useEffect(() => {
    if (!profile) return
    const next = valuesFromProfile(profile)
    skipAutoSaveRef.current = true
    form.setFieldsValue(next)
    const timer = window.setTimeout(() => {
      skipAutoSaveRef.current = false
    }, 0)
    return () => window.clearTimeout(timer)
  }, [profile, form])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const persist = useCallback(
    async (values: AppearanceFormValues) => {
      if (!profile) return
      if (appearanceEqual(values, valuesFromProfile(profile))) return
      setSaving(true)
      try {
        await updateMutation.mutateAsync({
          preferences: {
            ...mergeAppearancePreferences(profile.preferences),
            themeMode: values.themeMode,
            density: values.density,
            fontSize: values.fontSize,
            reducedMotion: values.reducedMotion,
          },
        })
        saveAppearanceToStorage({
          themeMode: values.themeMode,
          density: values.density,
          fontSize: values.fontSize,
          reducedMotion: values.reducedMotion,
        })
        message.success(t('settings.appearance.saved'))
      } catch {
        message.error(t('settings.saveError'))
      } finally {
        setSaving(false)
      }
    },
    [profile, updateMutation, t]
  )

  const onValuesChange = useCallback(() => {
    if (skipAutoSaveRef.current || !profile) return
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      const values = form.getFieldsValue(true) as AppearanceFormValues
      void persist(values)
    }, DEBOUNCE_MS)
  }, [profile, persist, form])

  return (
    <Card
      title={t('settings.appearance.cardTitle')}
      extra={
        saving ? (
          <Typography.Text type="secondary">{t('settings.appearance.saving')}</Typography.Text>
        ) : undefined
      }
    >
      <Flex vertical style={{ maxWidth: 480 }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={onValuesChange}
          initialValues={{
            themeMode: 'system',
            density: 'default',
            fontSize: 'standard',
            reducedMotion: 'system',
          }}
        >
          <Form.Item name="themeMode" label={t('settings.appearance.theme')}>
            <Segmented block options={themeOptions} />
          </Form.Item>
          <Form.Item name="density" label={t('settings.appearance.density')}>
            <Segmented block options={densityOptions} />
          </Form.Item>
          <Form.Item name="fontSize" label={t('settings.appearance.fontSize')}>
            <Segmented block options={fontSizeOptions} />
          </Form.Item>
          <Form.Item name="reducedMotion" label={t('settings.appearance.motion')}>
            <Segmented block options={motionOptions} />
          </Form.Item>
        </Form>
      </Flex>
    </Card>
  )
}

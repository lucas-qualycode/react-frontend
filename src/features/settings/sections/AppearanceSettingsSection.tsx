import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Flex, Form, Segmented, Typography, message } from 'antd'
import { useOutletContext } from 'react-router-dom'
import {
  mergeAppearancePreferences,
  saveAppearanceToStorage,
} from '@/app/appearance/mergeAppearancePreferences'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'
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
  const { profile, updateMutation } = useOutletContext<SettingsOutletContext>()
  const [form] = Form.useForm<AppearanceFormValues>()
  const [saving, setSaving] = useState(false)
  const skipAutoSaveRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!profile) return
    const next = valuesFromProfile(profile)
    skipAutoSaveRef.current = true
    form.setFieldsValue(next)
    const t = window.setTimeout(() => {
      skipAutoSaveRef.current = false
    }, 0)
    return () => window.clearTimeout(t)
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
        message.success('Appearance saved.')
      } catch {
        message.error('Could not save. Please try again.')
      } finally {
        setSaving(false)
      }
    },
    [profile, updateMutation]
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
      title="Appearance"
      extra={
        saving ? (
          <Typography.Text type="secondary">Saving…</Typography.Text>
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
          <Form.Item name="themeMode" label="Theme">
            <Segmented
              block
              options={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
            />
          </Form.Item>
          <Form.Item name="density" label="Density">
            <Segmented
              block
              options={[
                { label: 'Compact', value: 'compact' },
                { label: 'Default', value: 'default' },
                { label: 'Comfortable', value: 'comfortable' },
              ]}
            />
          </Form.Item>
          <Form.Item name="fontSize" label="Font size">
            <Segmented
              block
              options={[
                { label: 'Standard', value: 'standard' },
                { label: 'Large', value: 'large' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reducedMotion" label="Motion">
            <Segmented
              block
              options={[
                { label: 'System', value: 'system' },
                { label: 'Reduce', value: 'reduce' },
                { label: 'Full', value: 'full' },
              ]}
            />
          </Form.Item>
        </Form>
      </Flex>
    </Card>
  )
}

import { App, Divider, Form, Input, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EventIdentityFields } from '@/features/events/shared/components/EventIdentityFields'
import {
  eventInitialValuesFromEvent,
  normalizeIdentityPatchPayload,
  snapshotEventFormValuesForDirty,
  snapshotFromInitialForDirty,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import { usePatchEventIdentity } from '@/features/events/hooks'
import { useDebouncedAutoSave } from '@/features/events/edit/hooks/useDebouncedAutoSave'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

export function EditDetailsPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { eventId, event } = useEventEditContext()
  const patchIdentityMutation = usePatchEventIdentity()
  const [form] = Form.useForm<EventFormValues>()
  const allFormValues = Form.useWatch([], form) as EventFormValues | undefined
  const baselineRef = useRef('')
  const autoSavingRef = useRef(false)

  const initialValues = useMemo(() => eventInitialValuesFromEvent(event), [event])

  const coreValues = useMemo(
    (): EventFormValues => ({
      name: initialValues.name ?? '',
      description: initialValues.description ?? '',
      location_id: initialValues.location_id ?? '',
      imageURL: initialValues.imageURL ?? '',
      tag_ids: initialValues.tag_ids ?? [],
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
      visibility: initialValues.visibility ?? 'public',
    }),
    [initialValues],
  )

  const getMergedValues = useCallback((): EventFormValues => {
    const raw = form.getFieldsValue(true) as Partial<EventFormValues>
    return { ...coreValues, ...raw }
  }, [coreValues, form])

  useEffect(() => {
    baselineRef.current = snapshotFromInitialForDirty(initialValues)
    form.setFieldsValue({
      name: coreValues.name,
      description: coreValues.description,
      imageURL: coreValues.imageURL,
      tag_ids: coreValues.tag_ids,
      visibility: coreValues.visibility,
    })
  }, [eventId, form, initialValues, coreValues])

  const isDirty = useMemo(() => {
    return snapshotEventFormValuesForDirty(getMergedValues()) !== baselineRef.current
  }, [allFormValues, getMergedValues])

  const persist = useCallback(async () => {
    if (autoSavingRef.current || !isDirty) return
    try {
      await form.validateFields()
    } catch {
      return
    }
    autoSavingRef.current = true
    try {
      const values = getMergedValues()
      const payload = normalizeIdentityPatchPayload(values)
      await patchIdentityMutation.mutateAsync({ eventId, payload })
      baselineRef.current = snapshotEventFormValuesForDirty(values)
      message.success(t('events.edit.saveSuccess'))
    } catch {
      message.error(t('events.form.submitError'))
    } finally {
      autoSavingRef.current = false
    }
  }, [eventId, form, getMergedValues, isDirty, message, patchIdentityMutation, t])

  useDebouncedAutoSave(persist, isDirty, allFormValues)

  return (
    <EditTabShell showSave={false}>
      <Form form={form} layout="vertical" preserve>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
          {t('events.form.sectionIdentity')}
        </Typography.Title>
        <Divider style={{ margin: '0 0 16px' }} />
        <Form.Item name="imageURL" hidden>
          <Input />
        </Form.Item>
        <EventIdentityFields showCoverImage eventId={eventId} />
      </Form>
    </EditTabShell>
  )
}

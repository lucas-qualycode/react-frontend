import { App, Divider, Form, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EventVenueFields } from '@/features/events/shared/components/EventVenueFields'
import {
  eventInitialValuesFromEvent,
  normalizeVenuePatchPayload,
  snapshotEventFormValuesForDirty,
  snapshotFromInitialForDirty,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import { usePatchEventVenue } from '@/features/events/hooks'
import { useDebouncedAutoSave } from '@/features/events/edit/hooks/useDebouncedAutoSave'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

export function EditVenuePage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { eventId, event } = useEventEditContext()
  const patchVenueMutation = usePatchEventVenue()
  const [form] = Form.useForm<EventFormValues>()
  const allFormValues = Form.useWatch([], form) as EventFormValues | undefined
  const baselineRef = useRef('')
  const autoSavingRef = useRef(false)
  const isOnlineWatched = Form.useWatch('is_online', form) as boolean | undefined

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
      is_online: coreValues.is_online,
      location_id: coreValues.location_id,
    })
  }, [event.id, form, initialValues, coreValues])

  useEffect(() => {
    if (isOnlineWatched) {
      form.setFieldsValue({ location_id: '' })
    }
  }, [isOnlineWatched, form])

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
      const payload = normalizeVenuePatchPayload(values)
      await patchVenueMutation.mutateAsync({ eventId, payload })
      baselineRef.current = snapshotEventFormValuesForDirty(values)
      message.success(t('events.edit.saveSuccess'))
    } catch {
      message.error(t('events.form.submitError'))
    } finally {
      autoSavingRef.current = false
    }
  }, [eventId, form, getMergedValues, isDirty, message, patchVenueMutation, t])

  useDebouncedAutoSave(persist, isDirty, allFormValues)

  return (
    <EditTabShell showSave={false}>
      <Form form={form} layout="vertical" preserve>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
          {t('events.form.sectionVenue')}
        </Typography.Title>
        <Divider style={{ margin: '0 0 16px' }} />
        <EventVenueFields />
      </Form>
    </EditTabShell>
  )
}

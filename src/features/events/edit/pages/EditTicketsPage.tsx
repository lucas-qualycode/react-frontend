import { useQueryClient } from '@tanstack/react-query'
import { App, Form, Radio } from 'antd'
import type { RadioChangeEvent } from 'antd/es/radio'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { patchEventCommerce } from '@/features/events/api'
import { EventProductsSection } from '../sections/EventProductsSection'
import {
  eventEditTicketEditPath,
  eventEditTicketNewPath,
} from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import {
  eventInitialValuesFromEvent,
  FIELD_ITEM_STYLE,
  isPaidFromEventBaseline,
  snapshotEventFormValuesForDirty,
  snapshotFromInitialForDirty,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import { EditTabShell } from './EditTabShell'

export function EditTicketsPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { eventId, event } = useEventEditContext()
  const [form] = Form.useForm<EventFormValues>()
  const [isPaidSaving, setIsPaidSaving] = useState(false)
  const isPaidAutoSavingRef = useRef(false)
  const baselineRef = useRef('')

  const initialValues = useMemo(() => eventInitialValuesFromEvent(event), [event])

  useEffect(() => {
    baselineRef.current = snapshotFromInitialForDirty(initialValues)
    form.setFieldsValue({ is_paid: initialValues.is_paid ?? false })
  }, [eventId, form, initialValues])

  const handleIsPaidAutoSave = useCallback(
    async (e: RadioChangeEvent) => {
      const next = Boolean(e.target.value)
      if (isPaidAutoSavingRef.current) return
      const previous = isPaidFromEventBaseline(baselineRef.current)
      if (next === previous) return
      isPaidAutoSavingRef.current = true
      setIsPaidSaving(true)
      try {
        const updated = await patchEventCommerce(eventId, { is_paid: next })
        queryClient.setQueryData(['event', eventId], updated)
        queryClient.invalidateQueries({ queryKey: ['userEvents'] })
        const raw = form.getFieldsValue(true) as EventFormValues
        baselineRef.current = snapshotEventFormValuesForDirty(raw)
        message.success(t('events.edit.saveSuccess'))
      } catch (err) {
        form.setFieldsValue({ is_paid: previous })
        const text = err instanceof Error ? err.message : t('events.form.submitError')
        message.error(text)
      } finally {
        isPaidAutoSavingRef.current = false
        setIsPaidSaving(false)
      }
    },
    [eventId, form, message, queryClient, t],
  )

  return (
    <EditTabShell showSave={false}>
      <Form form={form} layout="vertical" preserve>
        <Form.Item style={FIELD_ITEM_STYLE} name="is_paid" label={t('events.form.paidLabel')}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            disabled={isPaidSaving}
            options={[
              { label: t('events.form.yes'), value: true },
              { label: t('events.form.no'), value: false },
            ]}
            onChange={(e) => void handleIsPaidAutoSave(e)}
          />
        </Form.Item>
        <EventProductsSection
          eventId={eventId}
          variant="ticket"
          onTicketCreate={() => navigate(eventEditTicketNewPath(eventId))}
          onTicketEdit={(productId) => navigate(eventEditTicketEditPath(eventId, productId))}
        />
      </Form>
    </EditTabShell>
  )
}

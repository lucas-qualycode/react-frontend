import { App, Button, Card, Flex, Form, Radio } from 'antd'
import type { RadioChangeEvent } from 'antd/es/radio'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { patchEventCommerce } from '@/features/events/api'
import {
  createWizardInvitationsPath,
  createWizardProductsPath,
  createWizardTicketEditPath,
  createWizardTicketNewPath,
} from '@/features/events/create/createWizardSteps'
import { EventProductsSection } from '@/features/events/edit/sections/EventProductsSection'
import { useEvent } from '@/features/events/hooks'
import {
  eventInitialValuesFromEvent,
  FIELD_ITEM_STYLE,
  isPaidFromEventBaseline,
  snapshotEventFormValuesForDirty,
  snapshotFromInitialForDirty,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'

export function NewTicketsStepPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { eventId } = useParams<{ eventId: string }>()
  const { data: event } = useEvent(eventId)
  const [form] = Form.useForm<EventFormValues>()
  const [isPaidSaving, setIsPaidSaving] = useState(false)
  const isPaidAutoSavingRef = useRef(false)
  const baselineRef = useRef('')

  const initialValues = useMemo(
    () => (event ? eventInitialValuesFromEvent(event) : null),
    [event],
  )

  useEffect(() => {
    if (!eventId || !initialValues) return
    baselineRef.current = snapshotFromInitialForDirty(initialValues)
    form.setFieldsValue({ is_paid: initialValues.is_paid ?? false })
  }, [eventId, form, initialValues])

  const handleIsPaidAutoSave = useCallback(
    async (e: RadioChangeEvent) => {
      if (!eventId) return
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

  if (!eventId) return null

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
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
          onTicketCreate={() => navigate(createWizardTicketNewPath(eventId))}
          onTicketEdit={(productId) => navigate(createWizardTicketEditPath(eventId, productId))}
        />
      </Form>
      <Flex justify="flex-end" gap={8} wrap="wrap" style={{ width: '100%', marginTop: 16 }}>
        <Button htmlType="button" onClick={() => navigate(createWizardProductsPath(eventId))}>
          {t('events.create.back')}
        </Button>
        <Button htmlType="button" onClick={() => navigate(createWizardInvitationsPath(eventId))}>
          {t('events.create.skip')}
        </Button>
        <Button type="primary" onClick={() => navigate(createWizardInvitationsPath(eventId))}>
          {t('events.create.next')}
        </Button>
      </Flex>
    </Card>
  )
}

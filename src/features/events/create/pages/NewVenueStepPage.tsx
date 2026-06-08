import { Button, Card, Flex, Form, message, Spin, Typography } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createWizardIdentityPath,
  createWizardSchedulePath,
} from '@/features/events/create/createWizardSteps'
import { useEvent, usePatchEventVenue } from '@/features/events/hooks'
import { EventVenueFields } from '@/features/events/shared/components/EventVenueFields'
import {
  eventInitialValuesFromEvent,
  isEventCoreDirty,
  mergeEventCoreFormValues,
  normalizeVenuePatchPayload,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'

export function NewVenueStepPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const [form] = Form.useForm<EventFormValues>()
  const { data: event, isLoading, isError } = useEvent(eventId)
  const patchVenueMutation = usePatchEventVenue()
  const isOnlineWatched = Form.useWatch('is_online', form)

  useEffect(() => {
    if (!event) return
    const core = eventInitialValuesFromEvent(event)
    form.setFieldsValue({
      is_online: core.is_online ?? false,
      location_id: core.location_id ?? '',
    })
  }, [event, form])

  useEffect(() => {
    if (isOnlineWatched) {
      form.setFieldsValue({ location_id: '' })
    }
  }, [isOnlineWatched, form])

  async function handleNext() {
    if (!eventId || !event) return
    try {
      const values = await form.validateFields(['is_online', 'location_id'])
      const core = eventInitialValuesFromEvent(event)
      const merged = mergeEventCoreFormValues(core, {
        is_online: values.is_online ?? false,
        location_id: values.location_id ?? '',
      })
      if (isEventCoreDirty(core, merged)) {
        const payload = normalizeVenuePatchPayload(merged)
        await patchVenueMutation.mutateAsync({ eventId, payload })
      }
      navigate(createWizardSchedulePath(eventId))
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(t('events.form.submitError'))
    }
  }

  if (isLoading && !event) {
    return (
      <Card style={{ flex: 1, minWidth: 0 }}>
        <Flex style={{ minHeight: 220 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      </Card>
    )
  }

  if (isError || !event) {
    return (
      <Card style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text type="danger">{t('events.detail.loadError')}</Typography.Text>
      </Card>
    )
  }

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          is_online: false,
          location_id: '',
        }}
      >
        <EventVenueFields />
        <Form.Item style={{ marginBottom: 0 }}>
          <Flex justify="flex-end" gap={8} wrap="wrap" style={{ width: '100%' }}>
            <Button htmlType="button" onClick={() => eventId && navigate(createWizardIdentityPath(eventId))}>
              {t('events.create.back')}
            </Button>
            <Button type="primary" loading={patchVenueMutation.isPending} onClick={() => void handleNext()}>
              {t('events.create.next')}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Card>
  )
}

import { Button, Card, Flex, Form, message, Spin, Typography } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { createWizardVenuePath } from '@/features/events/create/createWizardSteps'
import { useCreateDraftEvent, useEvent, usePatchEventIdentity } from '@/features/events/hooks'
import { EventIdentityFields } from '@/features/events/shared/components/EventIdentityFields'
import {
  DEFAULT_EVENT_VISIBILITY,
  eventInitialValuesFromEvent,
  isEventCoreDirty,
  mergeEventCoreFormValues,
  normalizeDraftEventPayload,
  normalizeIdentityPatchPayload,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'

export function NewIdentityStepPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId?: string }>()
  const [form] = Form.useForm<EventFormValues>()
  const { data: event, isLoading, isError } = useEvent(eventId)
  const createMutation = useCreateDraftEvent()
  const patchIdentityMutation = usePatchEventIdentity()
  const isExistingDraft = Boolean(eventId)

  useEffect(() => {
    if (!event) return
    const core = eventInitialValuesFromEvent(event)
    form.setFieldsValue({
      name: core.name ?? '',
      description: core.description ?? '',
      tag_ids: core.tag_ids ?? [],
      visibility: core.visibility ?? DEFAULT_EVENT_VISIBILITY,
    })
  }, [event, form])

  async function handleNext() {
    try {
      const values = await form.validateFields(['name', 'description', 'tag_ids', 'visibility'])
      if (isExistingDraft && eventId && event) {
        const core = eventInitialValuesFromEvent(event)
        const merged = mergeEventCoreFormValues(core, values as Partial<EventFormValues>)
        if (isEventCoreDirty(core, merged)) {
          const payload = normalizeIdentityPatchPayload(merged)
          await patchIdentityMutation.mutateAsync({ eventId, payload })
        }
        navigate(createWizardVenuePath(eventId))
        return
      }
      const payload = normalizeDraftEventPayload(values as EventFormValues)
      const created = await createMutation.mutateAsync(payload)
      navigate(createWizardVenuePath(created.id))
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(t('events.form.submitError'))
    }
  }

  if (isExistingDraft && isLoading && !event) {
    return (
      <Card style={{ flex: 1, minWidth: 0 }}>
        <Flex style={{ minHeight: 220 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      </Card>
    )
  }

  if (isExistingDraft && isError && !event) {
    return (
      <Card style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text type="danger">{t('events.detail.loadError')}</Typography.Text>
      </Card>
    )
  }

  const saving = createMutation.isPending || patchIdentityMutation.isPending

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: '',
          description: '',
          location_id: '',
          imageURL: '',
          tag_ids: [],
          is_paid: false,
          is_online: false,
          visibility: DEFAULT_EVENT_VISIBILITY,
        }}
      >
        <EventIdentityFields showCoverImage={false} />
        <Form.Item style={{ marginBottom: 0 }}>
          <Flex justify="flex-end" gap={8} wrap="wrap" style={{ width: '100%' }}>
            <Button type="primary" loading={saving} onClick={() => void handleNext()}>
              {t('events.create.next')}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Card>
  )
}

import { Button, Flex, Spin, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventForm } from './components/EventForm'
import { useEvent, useUpdateEvent } from './hooks'
import type { UpdateEventPayload } from './api'

const { Title, Text } = Typography

export function EventEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const updateMutation = useUpdateEvent()
  const { data: event, isLoading, isError, refetch } = useEvent(id)

  const initialValues = event
    ? {
        name: event.name,
        description: event.description ?? '',
        location: event.location ?? '',
        location_address: event.location_address ?? '',
        location_link: event.location_link ?? '',
        imageURL: event.imageURL ?? '',
        tag_ids: event.tags?.map((x) => x.id) ?? [],
        active: event.active,
        is_paid: event.is_paid,
        is_online: event.is_online,
      }
    : null

  async function handleSubmit(payload: UpdateEventPayload) {
    if (!id) return
    try {
      await updateMutation.mutateAsync({ eventId: id, payload })
      navigate(`/events/${id}`)
    } catch {
      message.error(t('events.form.submitError'))
    }
  }

  return (
    <Flex vertical style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Flex align="flex-start" justify="space-between" gap={16} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>
            {t('events.edit.title')}
          </Title>
          <Text type="secondary">{event?.name ?? ''}</Text>
        </div>
        <Link to={`/events/${id}`}>
          <Button>{t('events.detail.backToDetail')}</Button>
        </Link>
      </Flex>

      {isLoading ? (
        <Flex style={{ minHeight: 240 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      ) : null}

      {isError ? (
        <Flex vertical align="center" justify="center" gap={12} style={{ minHeight: 240 }}>
          <Text type="danger">{t('events.detail.loadError')}</Text>
          <Button onClick={() => refetch()}>{t('events.detail.retry')}</Button>
        </Flex>
      ) : null}

      {!isLoading && !isError && initialValues ? (
        <EventForm
          mode="edit"
          initialValues={initialValues}
          submitLoading={updateMutation.isPending}
          onSubmit={async (payload) => {
            await handleSubmit(payload)
          }}
        />
      ) : null}
    </Flex>
  )
}


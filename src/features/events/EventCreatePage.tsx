import { Button, Flex, Spin, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { EventForm } from './components/EventForm'
import { useCreateEvent } from './hooks'
import type { CreateEventPayload, UpdateEventPayload } from './api'

const { Title, Text } = Typography

export function EventCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createMutation = useCreateEvent()

  const initialValues = {
    name: '',
    description: '',
    location: '',
    location_address: '',
    location_link: '',
    imageURL: '',
        tag_ids: [],
    active: true,
    is_paid: false,
    is_online: false,
  }

  async function handleSubmit(payload: CreateEventPayload | UpdateEventPayload) {
    try {
      const created = await createMutation.mutateAsync(payload as CreateEventPayload)
      navigate(`/events/${created.id}`)
    } catch {
      message.error(t('events.form.submitError'))
    }
  }

  return (
    <Flex vertical style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Flex align="flex-start" justify="space-between" gap={16} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>
            {t('events.create.title')}
          </Title>
          <Text type="secondary">{t('events.create.subtitle')}</Text>
        </div>
        <Link to="/user-events">
          <Button>{t('events.detail.backToMyEvents')}</Button>
        </Link>
      </Flex>

      {createMutation.isPending ? (
        <Flex style={{ minHeight: 220 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      ) : null}

      <EventForm
        mode="create"
        initialValues={initialValues}
        submitLoading={createMutation.isPending}
        onSubmit={handleSubmit}
      />
    </Flex>
  )
}

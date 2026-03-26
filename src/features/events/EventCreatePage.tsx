import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Flex, Grid, Spin, Typography, message } from 'antd'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/auth/AuthContext'
import { settingsStorage } from '@/features/settings/storage'
import { EventForm, type EventFormSubmitMeta } from './components/EventForm'
import { useCreateEvent } from './hooks'
import { updateEvent, type CreateEventPayload, type UpdateEventPayload } from './api'

const { Title, Text } = Typography

export function EventCreatePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const createMutation = useCreateEvent()
  const [postCreateImageBusy, setPostCreateImageBusy] = useState(false)
  const screens = Grid.useBreakpoint()
  const backButtonIconOnly = screens.lg === false

  const initialValues = {
    name: '',
    description: '',
    location: '',
    location_address: '',
    location_link: '',
    imageURL: '',
    tag_ids: [],
    is_paid: false,
    is_online: false,
  }

  async function handleSubmit(
    payload: CreateEventPayload | UpdateEventPayload,
    meta?: EventFormSubmitMeta
  ) {
    try {
      const created = await createMutation.mutateAsync(payload as CreateEventPayload)
      const file = meta?.pendingEventImage
      if (file && user) {
        setPostCreateImageBusy(true)
        try {
          const path = `event-images/${user.uid}/${created.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
          const storageRef = ref(settingsStorage, path)
          await uploadBytes(storageRef, file)
          const url = await getDownloadURL(storageRef)
          await updateEvent(created.id, { imageURL: url })
        } finally {
          setPostCreateImageBusy(false)
        }
      }
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
          <Button
            icon={<ArrowLeftOutlined />}
            aria-label={t('events.detail.backToMyEvents')}
          >
            {backButtonIconOnly ? undefined : t('events.detail.backToMyEvents')}
          </Button>
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
        submitLoading={createMutation.isPending || postCreateImageBusy}
        onSubmit={handleSubmit}
      />
    </Flex>
  )
}

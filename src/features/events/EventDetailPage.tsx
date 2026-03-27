import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Card, Flex, Modal, Spin, Tag, Typography, message, Space } from 'antd'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDeleteEvent, useEvent } from './hooks'
import type { Event } from '@/shared/types/api'

const { Title, Text, Paragraph } = Typography

export function EventDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const deleteMutation = useDeleteEvent()
  const { data: event, isLoading, isError, refetch } = useEvent(id)

  async function requestDelete(e: Event) {
    if (deleteMutation.isPending) return
    Modal.confirm({
      title: t('events.detail.deleteModalTitle'),
      content: t('events.detail.deleteModalContent', { name: e.name }),
      okText: t('events.detail.deleteOk'),
      okType: 'danger',
      cancelText: t('events.detail.cancel'),
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(e.id)
          message.success(t('events.detail.deleteSuccess'))
          navigate('/user-events')
        } catch {
          message.error(t('events.detail.deleteError'))
        }
      },
    })
  }

  return (
    <Flex vertical style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Flex align="flex-start" justify="space-between" gap={16} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>
            {t('events.detail.title')}
          </Title>
          {event?.name ? <Text type="secondary">{event.name}</Text> : null}
        </div>
        <Space size={8} wrap>
          <Link to={`/events/${id}/edit`}>
            <Button icon={<EditOutlined />}>{t('events.detail.edit')}</Button>
          </Link>
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleteMutation.isPending}
            onClick={() => {
              if (event) void requestDelete(event)
            }}
          >
            {t('events.detail.delete')}
          </Button>
        </Space>
      </Flex>

      {isLoading ? (
        <Flex style={{ minHeight: 260 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      ) : null}

      {isError ? (
        <Flex vertical align="center" justify="center" gap={12} style={{ minHeight: 260 }}>
          <Text type="danger">{t('events.detail.loadError')}</Text>
          <Button onClick={() => refetch()}>{t('events.detail.retry')}</Button>
        </Flex>
      ) : null}

      {!isLoading && !isError && event ? (
        <Card>
          <Flex gap={24} align="flex-start" wrap="wrap">
            <Flex
              style={{
                width: 320,
                minWidth: 280,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--ant-color-border)',
                background: 'var(--ant-color-bg-elevated)',
              }}
              vertical
              align="center"
              justify="center"
            >
              {event.imageURL ? (
                <img
                  src={event.imageURL}
                  alt={event.name}
                  style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ padding: 24 }}>
                  <Text type="secondary">{t('events.detail.noImage')}</Text>
                </div>
              )}
            </Flex>

            <Flex vertical gap={12} style={{ flex: 1, minWidth: 260 }}>
              <Title level={3} style={{ marginBottom: 0 }}>
                {event.name}
              </Title>
              {event.description ? <Paragraph style={{ marginBottom: 0 }}>{event.description}</Paragraph> : null}

              <Flex gap={8} wrap>
                <Tag color={event.active ? 'green' : 'default'}>{event.active ? t('events.detail.badgeActive') : t('events.detail.badgeInactive')}</Tag>
                {typeof event.is_paid === 'boolean' ? (
                  <Tag color={event.is_paid ? 'blue' : 'default'}>{event.is_paid ? t('events.detail.badgePaid') : t('events.detail.badgeFree')}</Tag>
                ) : null}
                {typeof event.is_online === 'boolean' ? (
                  <Tag color={event.is_online ? 'purple' : 'default'}>{event.is_online ? t('events.detail.badgeOnline') : t('events.detail.badgeOffline')}</Tag>
                ) : null}
              </Flex>

              {!event.is_online && event.location ? (
                <Flex vertical gap={4}>
                  <Text strong>{t('events.detail.venueHeading')}</Text>
                  {event.location.venue_name ? (
                    <Text type="secondary">{event.location.venue_name}</Text>
                  ) : null}
                  {event.location.formatted_address ? (
                    <Text type="secondary">{event.location.formatted_address}</Text>
                  ) : null}
                  {event.location.maps_url ? (
                    <Text>
                      <a href={event.location.maps_url} target="_blank" rel="noreferrer">
                        {t('events.detail.mapsLink')}
                      </a>
                    </Text>
                  ) : null}
                </Flex>
              ) : null}

              <Flex vertical gap={8} style={{ marginTop: 8 }}>
                <Text strong>{t('events.detail.tagsHeading')}</Text>
                <Flex gap={8} wrap>
                  {(event.tags ?? []).map((tg) => (
                    <Tag key={tg.id}>{tg.name}</Tag>
                  ))}
                </Flex>
              </Flex>

              <Flex gap={12} wrap style={{ marginTop: 12 }}>
                <Link to={`/events/${event.id}/schedules`}>
                  <Button>{t('events.detail.goToSchedules')}</Button>
                </Link>
                <Link to={`/events/${event.id}/products`}>
                  <Button>{t('events.detail.goToProducts')}</Button>
                </Link>
                <Link to={`/events/${event.id}/products`}>
                  <Button type="default" disabled>
                    {t('events.detail.goToInvitations')}
                  </Button>
                </Link>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      ) : null}
    </Flex>
  )
}

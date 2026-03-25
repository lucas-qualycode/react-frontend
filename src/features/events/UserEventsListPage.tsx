import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Card, Col, Empty, Flex, Grid, Modal, Row, Space, Spin, Tag, Typography, Button, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/app/auth/AuthContext'
import type { Event } from '@/shared/types/api'
import { useDeleteEvent, useUserEvents } from './hooks'

const { Title, Text } = Typography

function formatEventDate(locale: string, iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit' }).format(d)
}

export function UserEventsListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { xs } = Grid.useBreakpoint()
  const { data: events, isLoading, isError, refetch } = useUserEvents(user?.uid)
  const deleteMutation = useDeleteEvent()

  function requestDelete(event: Event) {
    if (deleteMutation.isPending) return
    Modal.confirm({
      title: t('userEvents.deleteModalTitle'),
      content: t('userEvents.deleteModalContent', { name: event.name }),
      okText: t('userEvents.deleteOk'),
      okType: 'danger',
      cancelText: t('userEvents.cancel'),
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(event.id)
          message.success(t('userEvents.deleteSuccess'))
        } catch {
          message.error(t('userEvents.deleteError'))
        }
      },
    })
  }

  const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US'

  return (
    <Flex vertical style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Flex align="center" justify="space-between" gap={16} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>
            {t('userEvents.title')}
          </Title>
          <Text type="secondary">{t('userEvents.subtitle')}</Text>
        </div>
        <Link to="/events/create">
          <Button type="primary" icon={<PlusOutlined />}>
            {t('userEvents.create')}
          </Button>
        </Link>
      </Flex>

      {isLoading ? (
        <Flex style={{ minHeight: 220 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      ) : null}

      {isError ? (
        <Flex vertical align="center" justify="center" gap={12} style={{ minHeight: 220 }}>
          <Text type="danger">{t('userEvents.loadError')}</Text>
          <Button onClick={() => refetch()}>{t('userEvents.retry')}</Button>
        </Flex>
      ) : null}

      {!isLoading && !isError ? (
        events && events.length > 0 ? (
          <Row gutter={[16, 16]}>
            {events.map((event) => {
              const createdAtLabel = formatEventDate(locale, event.created_at)
              return (
                <Col key={event.id} xs={24} sm={12}>
                  <Card
                    hoverable
                    title={
                      <Flex vertical gap={8}>
                        <Text strong>{event.name}</Text>
                        <Flex gap={8} wrap="wrap" align="center">
                          {typeof event.active === 'boolean' ? (
                            <Tag color={event.active ? 'green' : 'default'}>
                              {event.active ? t('userEvents.badgeActive') : t('userEvents.badgeInactive')}
                            </Tag>
                          ) : null}
                          {createdAtLabel ? <Text type="secondary">{createdAtLabel}</Text> : null}
                        </Flex>
                      </Flex>
                    }
                    cover={
                      event.imageURL ? (
                        <img
                          src={event.imageURL}
                          alt={event.name}
                          style={{ height: xs ? 180 : 200, objectFit: 'cover' }}
                        />
                      ) : undefined
                    }
                    onClick={() => navigate(`/events/${event.id}`)}
                    extra={
                      <Space size={0}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={t('userEvents.deleteAria', { name: event.name })}
                          disabled={deleteMutation.isPending}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            requestDelete(event)
                          }}
                        />
                      </Space>
                    }
                  >
                    {event.location ? <Text type="secondary">{event.location}</Text> : null}
                  </Card>
                </Col>
              )
            })}
          </Row>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('userEvents.emptyDescription')}
            style={{ marginTop: 24 }}
          >
            <Flex justify="center" align="center" gap={12}>
              <Link to="/events/create">
                <Button type="primary" icon={<PlusOutlined />}>
                  {t('userEvents.create')}
                </Button>
              </Link>
            </Flex>
          </Empty>
        )
      ) : null}
    </Flex>
  )
}


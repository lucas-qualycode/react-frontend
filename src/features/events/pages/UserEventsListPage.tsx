import { EditOutlined, EyeOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons'
import { Card, Col, Empty, Flex, Grid, Row, Space, Spin, Tag, Tooltip, Typography, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/app/auth/AuthContext'
import { PageBreadcrumbBar } from '@/shared/components/PageBreadcrumbBar'
import { useUserEvents } from '../hooks'

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

  const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US'

  return (
    <Flex vertical style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <PageBreadcrumbBar
        items={[
          { title: <Link to="/">{t('events.breadcrumb.home')}</Link> },
          { title: t('userEvents.title') },
        ]}
      />
      <Flex align="center" justify="space-between" gap={16} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>
            {t('userEvents.title')}
          </Title>
          <Text type="secondary">{t('userEvents.subtitle')}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/events/create')}>
          {t('userEvents.create')}
        </Button>
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
              const imageHeight = xs ? 180 : 200
              return (
                <Col key={event.id} xs={24} sm={12}>
                  <Card
                    hoverable
                    styles={{ body: { padding: 0 } }}
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                  >
                    <Flex vertical>
                      <Flex
                        justify="space-between"
                        align="center"
                        gap={12}
                        style={{ padding: '12px 24px' }}
                      >
                        <Text strong ellipsis style={{ flex: 1, minWidth: 0 }}>
                          {event.name}
                        </Text>
                        <Flex align="center" gap={8} wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
                          {typeof event.active === 'boolean' ? (
                            <Tag color={event.active ? 'green' : 'default'}>
                              {event.active ? t('userEvents.badgeActive') : t('userEvents.badgeInactive')}
                            </Tag>
                          ) : null}
                          <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                            <Space size={0}>
                              <Tooltip title={t('userEvents.viewTooltip')} placement="bottom">
                                <Button
                                  type="text"
                                  icon={<EyeOutlined />}
                                  aria-label={t('userEvents.viewEventAria', { name: event.name })}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    navigate(`/events/${event.id}`)
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title={t('userEvents.editTooltip')} placement="bottom">
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  aria-label={t('userEvents.editAria', { name: event.name })}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    navigate(`/events/${event.id}/edit`)
                                  }}
                                />
                              </Tooltip>
                            </Space>
                          </span>
                        </Flex>
                      </Flex>
                      <div style={{ width: '100%', height: imageHeight, overflow: 'hidden' }}>
                        {event.imageURL ? (
                          <img
                            src={event.imageURL}
                            alt={event.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Flex
                            vertical
                            align="center"
                            justify="center"
                            gap={8}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'var(--ant-color-bg-elevated)',
                              borderTop: '1px dashed var(--ant-color-border)',
                              padding: 16,
                              boxSizing: 'border-box',
                            }}
                          >
                            <PictureOutlined
                              style={{ fontSize: 40, color: 'var(--ant-color-text-quaternary)' }}
                              aria-hidden
                            />
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                              {t('events.detail.noImage')}
                            </Text>
                          </Flex>
                        )}
                      </div>
                      {createdAtLabel ? (
                        <Flex vertical gap={8} style={{ padding: '12px 24px 24px' }}>
                          <Text type="secondary">{createdAtLabel}</Text>
                        </Flex>
                      ) : null}
                    </Flex>
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
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/events/create')}>
                {t('userEvents.create')}
              </Button>
            </Flex>
          </Empty>
        )
      ) : null}
    </Flex>
  )
}


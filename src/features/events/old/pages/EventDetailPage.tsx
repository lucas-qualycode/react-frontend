import { Button, Flex, Spin, Typography } from 'antd'
import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvent } from '@/features/events/hooks'

const EventDetailComposition = lazy(() =>
  import('@/features/events/components/invitationFlow/EventDetailComposition').then((m) => ({
    default: m.EventDetailComposition,
  })),
)

const { Text } = Typography

export function EventDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: event, isLoading, isError, refetch } = useEvent(id)

  return (
    <Flex vertical style={{ width: '100%' }}>
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
        <Suspense
          fallback={
            <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
              <Spin size="large" />
            </Flex>
          }
        >
          <EventDetailComposition event={event} />
        </Suspense>
      ) : null}
    </Flex>
  )
}

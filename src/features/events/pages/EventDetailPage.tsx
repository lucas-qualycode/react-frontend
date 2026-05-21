import { Button, Flex, Spin, Typography } from 'antd'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EventDetailComposition } from '../components/eventDetail/EventDetailComposition'
import { useEvent } from '@/features/events/hooks'

const { Text } = Typography

export function EventDetailPage() {
  const { t } = useTranslation()
  const { id, invitationId } = useParams<{ id: string; invitationId?: string }>()
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
        <EventDetailComposition event={event} invitationId={invitationId} />
      ) : null}
    </Flex>
  )
}

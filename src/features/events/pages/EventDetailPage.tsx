import { Button, Flex, Spin, Typography } from 'antd'
import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EventDetailComposition } from '../components/invitationFlow/EventDetailComposition'
import { useEvent } from '@/features/events/hooks'
import { InvitationAccessProvider } from '@/shared/api/InvitationAccessContext'
import type { InvitationAccess } from '@/shared/api/invitationAccess'

const { Text } = Typography

function EventDetailPageContent() {
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

export function EventDetailPage() {
  const { invitationId } = useParams<{ invitationId?: string }>()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')?.trim() ?? ''

  const invitationAccess = useMemo((): InvitationAccess | null => {
    if (!invitationId || !tokenFromUrl) return null
    return { invitationId, token: tokenFromUrl }
  }, [invitationId, tokenFromUrl])

  return (
    <InvitationAccessProvider value={invitationAccess}>
      <EventDetailPageContent />
    </InvitationAccessProvider>
  )
}

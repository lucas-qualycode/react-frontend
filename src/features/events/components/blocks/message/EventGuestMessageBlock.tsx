import { HeartOutlined } from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { GuestFlowActions } from '../../invitationFlow/shared/GuestFlowActions'
import { GuestFlowBlockHeader } from '../../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestFlowBorderField } from '../../invitationFlow/shared/GuestFlowBorderField'
import { GuestFlowContentPanel } from '../../invitationFlow/shared/GuestFlowContentPanel'
import type { EventGuestMessageVariant } from '../../invitationFlow/types'
import './eventGuestMessage.css'

const { Text } = Typography

export const GUEST_COUPLE_MESSAGE_MAX_LENGTH = 4000

type Props = {
  event: Event
  variant: EventGuestMessageVariant
  message: string
  onMessageChange: (message: string) => void
  onBack?: () => void
  onContinue: () => void
}

export function EventGuestMessageBlock({
  variant,
  message,
  onMessageChange,
  onBack,
  onContinue,
}: Props) {
  const { t } = useTranslation()

  if (variant !== 'wedding') return null

  return (
    <GuestFlowContentPanel>
        <GuestFlowBlockHeader
          icon={<HeartOutlined />}
          title={t('events.detail.guestMessage.title')}
          subtitle={t('events.detail.guestMessage.subtitle')}
        />

        <Flex vertical gap={8} className="guest-message-form" style={{ width: '100%' }}>
          <GuestFlowBorderField
            label={t('events.detail.guestMessage.fieldLabel')}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder={t('events.detail.guestMessage.fieldPlaceholder')}
            multiline
            rows={8}
            maxLength={GUEST_COUPLE_MESSAGE_MAX_LENGTH}
            showCount
          />
          <Text type="secondary" className="guest-message-optional-hint">
            {t('events.detail.guestMessage.optionalHint')}
          </Text>
        </Flex>

        <GuestFlowActions>
          {onBack ? (
            <Button size="large" onClick={onBack}>
              {t('events.detail.guestMessage.back')}
            </Button>
          ) : null}
          <Button type="primary" size="large" onClick={onContinue}>
            {t('events.detail.guestMessage.continue')}
          </Button>
        </GuestFlowActions>
    </GuestFlowContentPanel>
  )
}

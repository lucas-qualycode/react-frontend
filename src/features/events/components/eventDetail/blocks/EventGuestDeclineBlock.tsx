import { Button, Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { GuestFlowActions } from '../GuestFlowActions'
import { GuestFlowBorderField } from '../GuestFlowBorderField'
import { guestPanelContentStyle, guestPanelShellClassName, guestPanelShellStyle } from '../guestPanelLayout'
import type { EventGuestDeclineVariant } from '../types'

const { Title, Paragraph } = Typography

type Props = {
  event: Event
  variant: EventGuestDeclineVariant
  message: string
  onMessageChange: (message: string) => void
  onBack: () => void
}

export function EventGuestDeclineBlock({ event, variant, message, onMessageChange, onBack }: Props) {
  const { t } = useTranslation()

  if (variant !== 'wedding') return null

  return (
    <div className={guestPanelShellClassName} style={guestPanelShellStyle}>
      <Flex
        vertical
        align="center"
        gap={24}
        style={{ ...guestPanelContentStyle, textAlign: 'center' }}
      >
        <Flex vertical align="center" gap={8} style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0, fontWeight: 600, fontSize: '2rem' }}>
            {t('events.detail.guestDecline.title')}
          </Title>
          <Paragraph style={{ margin: 0, width: '100%', fontSize: 16, lineHeight: 1.75 }}>
            {t('events.detail.guestDecline.intro', { name: event.name })}
          </Paragraph>
        </Flex>

        <Flex vertical gap={8} style={{ width: '100%', textAlign: 'left' }}>
          <GuestFlowBorderField
            label={t('events.detail.guestDecline.messageLabel')}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder={t('events.detail.guestDecline.messagePlaceholder')}
            multiline
            rows={5}
          />
        </Flex>

        <GuestFlowActions>
          <Button size="large" onClick={onBack}>
            {t('events.detail.guestDecline.back')}
          </Button>
          <Button type="primary" size="large">
            {t('events.detail.guestDecline.confirm')}
          </Button>
        </GuestFlowActions>
      </Flex>
    </div>
  )
}

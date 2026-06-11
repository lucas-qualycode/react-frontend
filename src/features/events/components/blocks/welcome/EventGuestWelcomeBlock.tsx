import { Button, Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { GuestEventScheduleDetails } from '../../invitationFlow/shared/GuestEventScheduleDetails'
import { GuestWelcomeEmblem } from '../../invitationFlow/shared/GuestWelcomeEmblem'
import { guestPanelContentStyle, guestPanelShellClassName, guestPanelShellStyle } from '../../invitationFlow/shared/guestPanelLayout'
import type { EventGuestWelcomeVariant } from '../../invitationFlow/types'
import './eventGuestWelcome.css'

const { Title, Paragraph } = Typography

type Props = {
  event: Event
  variant: EventGuestWelcomeVariant
  resumeMode?: boolean
  onCannotAttend?: () => void
  onConfirmAttendance?: () => void
}

export function EventGuestWelcomeBlock({
  event,
  variant,
  resumeMode = false,
  onCannotAttend,
  onConfirmAttendance,
}: Props) {
  const { t } = useTranslation()

  if (variant !== 'wedding') return null

  return (
    <div className={guestPanelShellClassName} style={guestPanelShellStyle}>
      <Flex
        vertical
        align="center"
        gap={40}
        style={{
          ...guestPanelContentStyle,
          textAlign: 'center',
          overflowWrap: 'anywhere',
        }}
      >
        <GuestWelcomeEmblem />

        <Flex vertical align="center" gap={16} style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0, fontWeight: 600, fontSize: '2.5rem' }}>
            {event.name}
          </Title>
          {event.description?.trim() ? (
            <Paragraph
              style={{
                margin: 0,
                width: '100%',
                fontSize: 17,
                lineHeight: 1.75,
                color: 'var(--ant-color-text-secondary)',
              }}
            >
              {event.description.trim()}
            </Paragraph>
          ) : null}
        </Flex>

        <GuestEventScheduleDetails event={event} />

        <Paragraph
          style={{
            margin: 0,
            width: '100%',
            fontSize: 16,
            lineHeight: 1.8,
            color: 'var(--ant-color-text-secondary)',
          }}
        >
          {t('events.detail.guestWelcome.closing')}
        </Paragraph>

        <Flex vertical align="center" gap={16} style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            onClick={onConfirmAttendance}
            style={{
              width: '80%',
              height: 56,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {resumeMode
              ? t('events.detail.guestWelcome.ctaResume')
              : t('events.detail.guestWelcome.ctaPrimary')}
          </Button>
          {!resumeMode ? (
            <Button
              type="link"
              className="guest-welcome-decline-cta"
              onClick={onCannotAttend}
              style={{
                color: 'var(--ant-color-primary)',
                fontSize: 16,
                fontWeight: 700,
                height: 'auto',
                padding: 0,
                border: 'none',
                boxShadow: 'none',
              }}
            >
              {t('events.detail.guestWelcome.ctaSecondary')}
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </div>
  )
}

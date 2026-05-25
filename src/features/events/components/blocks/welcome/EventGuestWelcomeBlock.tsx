import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { schedulesFromEvent } from '@/features/events/scheduleList'
import { scheduleEventStart } from '../../invitationFlow/lib/scheduleEventZoned'
import { guestPanelContentStyle, guestPanelShellClassName, guestPanelShellStyle } from '../../invitationFlow/shared/guestPanelLayout'
import type { EventGuestWelcomeVariant } from '../../invitationFlow/types'
import './eventGuestWelcome.css'

const { Title, Text, Paragraph } = Typography

type Props = {
  event: Event
  variant: EventGuestWelcomeVariant
  onCannotAttend?: () => void
  onConfirmAttendance?: () => void
}

type ScheduleWhenParts = {
  date: string
  time: string
}

function formatScheduleWhenParts(
  lang: string,
  sched: { timezone: string },
  start: ReturnType<typeof scheduleEventStart>,
): ScheduleWhenParts | null {
  if (!start?.isValid()) return null
  const locale = lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
  const timeZone = sched.timezone.trim()
  const instant = start.toDate()
  try {
    const date = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    }).format(instant)
    const time = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(instant)
    return { date, time }
  } catch {
    return {
      date: start.format('MMMM D, YYYY'),
      time: start.format('h:mm A'),
    }
  }
}

export function EventGuestWelcomeBlock({ event, variant, onCannotAttend, onConfirmAttendance }: Props) {
  const { t, i18n } = useTranslation()
  const schedules = useMemo(() => schedulesFromEvent(event), [event])
  const primarySchedule = schedules[0]
  const startZoned = useMemo(() => scheduleEventStart(primarySchedule), [primarySchedule])
  const whenParts = useMemo(() => {
    if (!primarySchedule || !startZoned?.isValid()) return null
    return formatScheduleWhenParts(i18n.language, primarySchedule, startZoned)
  }, [i18n.language, primarySchedule, startZoned])

  if (variant !== 'wedding') return null

  const venueLine =
    !event.is_online && event.location
      ? [event.location.venue_name, event.location.formatted_address].filter(Boolean).join(' · ') || null
      : null

  const mapsUrl =
    !event.is_online && event.location?.maps_url?.trim() ? event.location.maps_url.trim() : null

  const whereLabel = (
    <div className="guest-welcome-detail-card-label-row">
      <Text type="secondary" style={{ fontSize: 13, margin: 0 }}>
        {t('events.detail.guestWelcome.detailsWhere')}
      </Text>
      {mapsUrl ? <EnvironmentOutlined className="guest-welcome-detail-card-icon" aria-hidden /> : null}
    </div>
  )

  const whereValue = event.is_online ? (
    <Text style={{ fontSize: 17, lineHeight: 1.5 }}>{t('events.detail.guestWelcome.detailsOnline')}</Text>
  ) : venueLine ? (
    <Text style={{ fontSize: 17, lineHeight: 1.5 }}>{venueLine}</Text>
  ) : (
    <Text type="secondary" style={{ fontSize: 17, lineHeight: 1.5 }}>
      {t('events.detail.guestWelcome.detailsWhereTbd')}
    </Text>
  )

  const whereCardClassName = mapsUrl
    ? 'guest-welcome-detail-card guest-welcome-detail-card--maps-link'
    : 'guest-welcome-detail-card'

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
        <div className="guest-welcome-emblem" role="img" aria-label={t('events.detail.guestWelcome.decorIconAria')}>
          <div className="guest-welcome-emblem-circle">
            <svg
              className="guest-welcome-heart-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
        </div>

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

        <div className="guest-welcome-details">
          <div className="guest-welcome-schedule-row">
            <div className="guest-welcome-detail-card guest-welcome-schedule-when">
              <div className="guest-welcome-detail-card-label-row">
                <Text type="secondary" style={{ fontSize: 13, margin: 0 }}>
                  {t('events.detail.guestWelcome.detailsWhen')}
                </Text>
                <CalendarOutlined className="guest-welcome-detail-card-icon" aria-hidden />
              </div>
              {whenParts ? (
                <div className="guest-welcome-when-date">
                  <Text style={{ fontSize: 17, lineHeight: 1.5 }}>{whenParts.date}</Text>
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 17, lineHeight: 1.5 }}>
                  {t('events.detail.guestWelcome.detailsWhenTbd')}
                </Text>
              )}
            </div>
            <div className="guest-welcome-detail-card guest-welcome-schedule-time">
              <div className="guest-welcome-detail-card-label-row">
                <Text type="secondary" style={{ fontSize: 13, margin: 0 }}>
                  {t('events.detail.guestWelcome.detailsTime')}
                </Text>
                <ClockCircleOutlined className="guest-welcome-detail-card-icon" aria-hidden />
              </div>
              {whenParts ? (
                <div className="guest-welcome-when-time">
                  <Text style={{ fontSize: 14, lineHeight: 1.5 }}>{whenParts.time}</Text>
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {t('events.detail.guestWelcome.detailsWhenTbd')}
                </Text>
              )}
            </div>
          </div>
          {mapsUrl ? (
            <a
              className={whereCardClassName}
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t('events.detail.guestWelcome.detailsWhere')}: ${venueLine ?? ''}. ${t('events.detail.mapsLink')}`}
            >
              {whereLabel}
              {whereValue}
            </a>
          ) : (
            <div className={whereCardClassName}>
              {whereLabel}
              {whereValue}
            </div>
          )}
        </div>

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
            {t('events.detail.guestWelcome.ctaPrimary')}
          </Button>
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
        </Flex>
      </Flex>
    </div>
  )
}

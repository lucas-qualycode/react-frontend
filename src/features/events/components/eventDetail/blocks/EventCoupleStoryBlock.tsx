import { HeartFilled } from '@ant-design/icons'
import { Button, Flex, Spin, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Event } from '@/shared/types/api'
import { useEventSchedules } from '../../../hooks'
import { scheduleEventStart } from '../scheduleEventZoned'
import type { EventCoupleStoryVariant } from '../types'

const { Title, Text, Paragraph } = Typography

type Props = {
  event: Event
  variant: EventCoupleStoryVariant
}

function formatScheduleLine(
  lang: string,
  sched: { timezone: string },
  start: ReturnType<typeof scheduleEventStart>,
): string | null {
  if (!start?.isValid()) return null
  const locale = lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: sched.timezone.trim(),
    }).format(start.toDate())
  } catch {
    return start.format('MMMM D, YYYY h:mm A')
  }
}

export function EventCoupleStoryBlock({ event, variant }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: schedules = [], isLoading: schedulesLoading } = useEventSchedules(event.id)
  const primarySchedule = schedules[0]
  const startZoned = useMemo(() => scheduleEventStart(primarySchedule), [primarySchedule])
  const whenLine = useMemo(() => {
    if (!primarySchedule || !startZoned?.isValid()) return null
    return formatScheduleLine(i18n.language, primarySchedule, startZoned)
  }, [i18n.language, primarySchedule, startZoned])

  if (variant !== 'wedding') return null

  const venueLine =
    !event.is_online && event.location
      ? [event.location.venue_name, event.location.formatted_address].filter(Boolean).join(' · ') || null
      : null

  return (
    <div
      style={{
        width: '100%',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        padding: '56px 32px 64px',
        background:
          'linear-gradient(180deg, rgba(255, 240, 246, 0.95) 0%, rgba(250, 245, 255, 0.75) 42%, var(--ant-color-bg-layout) 100%)',
      }}
    >
      <Flex
        vertical
        align="center"
        gap={28}
        style={{
          width: 'min(78ch, 100%)',
          maxWidth: '100%',
          marginInline: 'auto',
          boxSizing: 'border-box',
          textAlign: 'center',
          overflowWrap: 'anywhere',
        }}
      >
        <Flex
          align="center"
          justify="center"
          role="img"
          aria-label={t('events.detail.coupleStory.decorIconAria')}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--ant-color-primary-bg)',
            color: 'var(--ant-color-primary)',
            fontSize: 26,
          }}
        >
          <HeartFilled aria-hidden />
        </Flex>

        <Flex vertical align="center" gap={12} style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0, fontWeight: 600, fontSize: '2.5rem' }}>
            {event.name}
          </Title>
          {event.description?.trim() ? (
            <Paragraph style={{ margin: 0, width: '100%', fontSize: 17, lineHeight: 1.75 }}>
              {event.description.trim()}
            </Paragraph>
          ) : null}
        </Flex>

        <Flex vertical gap={16} style={{ width: '100%', paddingTop: 8 }}>
          <Text strong style={{ fontSize: 15, letterSpacing: 0.04, textTransform: 'uppercase' }}>
            {t('events.detail.coupleStory.detailsHeading')}
          </Text>
          <Flex vertical gap={14} style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                {t('events.detail.coupleStory.detailsWhen')}
              </Text>
              {schedulesLoading ? (
                <Spin size="small" />
              ) : whenLine ? (
                <Text style={{ fontSize: 17 }}>{whenLine}</Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 17 }}>
                  {t('events.detail.coupleStory.detailsWhenTbd')}
                </Text>
              )}
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                {t('events.detail.coupleStory.detailsWhere')}
              </Text>
              {event.is_online ? (
                <Text style={{ fontSize: 17 }}>{t('events.detail.coupleStory.detailsOnline')}</Text>
              ) : venueLine ? (
                <Text style={{ fontSize: 17 }}>{venueLine}</Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 17 }}>
                  {t('events.detail.coupleStory.detailsWhereTbd')}
                </Text>
              )}
            </div>
          </Flex>
        </Flex>

        <Paragraph
          style={{
            margin: 0,
            width: '100%',
            fontSize: 16,
            lineHeight: 1.8,
            color: 'var(--ant-color-text-secondary)',
          }}
        >
          {t('events.detail.coupleStory.closing')}
        </Paragraph>

        <Flex gap={12} wrap justify="center" style={{ width: '100%' }}>
          <Button type="primary" size="large" onClick={() => navigate(`/events/${event.id}/edit?section=invitations`)}>
            {t('events.detail.coupleStory.ctaPrimary')}
          </Button>
          <Button size="large" onClick={() => navigate(`/events/${event.id}/edit?section=details`)}>
            {t('events.detail.coupleStory.ctaSecondary')}
          </Button>
        </Flex>
      </Flex>
    </div>
  )
}

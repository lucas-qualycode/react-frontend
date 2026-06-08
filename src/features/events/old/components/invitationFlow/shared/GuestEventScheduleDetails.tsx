import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import {
  resolveGuestEventMapsUrl,
  resolveGuestEventScheduleWhen,
  resolveGuestEventVenueLine,
} from '../lib/guestEventScheduleDisplay'
import '../../blocks/welcome/eventGuestWelcome.css'

const { Text } = Typography

type Props = {
  event: Event
}

export function GuestEventScheduleDetails({ event }: Props) {
  const { t, i18n } = useTranslation()
  const whenParts = resolveGuestEventScheduleWhen(event, i18n.language)
  const venueLine = resolveGuestEventVenueLine(event)
  const mapsUrl = resolveGuestEventMapsUrl(event)

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
  )
}

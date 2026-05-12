import { Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import type { EventHeroVariant } from '../types'

const { Title, Text } = Typography

type Props = {
  event: Event
  variant: EventHeroVariant
}

export function EventHeroBlock({ event, variant }: Props) {
  const { t } = useTranslation()
  const alt = event.name

  if (variant === 'wedding') {
    if (!event.imageURL) {
      return (
        <Flex
          vertical
          gap={12}
          style={{
            borderRadius: 12,
            border: '1px solid var(--ant-color-border)',
            padding: 28,
            background: 'var(--ant-color-fill-tertiary)',
          }}
        >
          <Text strong>{t('events.detail.hero.eyebrowWedding')}</Text>
          <Title level={2} style={{ margin: 0, letterSpacing: 0.3 }}>
            {event.name}
          </Title>
          <Text type="secondary">{t('events.detail.noImage')}</Text>
        </Flex>
      )
    }

    return (
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--ant-color-border)',
        }}
      >
        <img
          src={event.imageURL}
          alt={alt}
          style={{ width: '100%', height: 360, objectFit: 'cover', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.78) 100%)',
            pointerEvents: 'none',
          }}
        />
        <Flex vertical gap={8} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.88)', margin: 0 }} strong>
            {t('events.detail.hero.eyebrowWedding')}
          </Text>
          <Title level={2} style={{ margin: 0, color: '#fff', letterSpacing: 0.3 }}>
            {event.name}
          </Title>
        </Flex>
      </div>
    )
  }

  return (
    <Flex
      vertical
      gap={0}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--ant-color-border)',
      }}
    >
      {event.imageURL ? (
        <img src={event.imageURL} alt={alt} style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }} />
      ) : (
        <Flex align="center" justify="center" style={{ width: '100%', minHeight: 200, background: 'var(--ant-color-fill-tertiary)' }}>
          <Text type="secondary">{t('events.detail.noImage')}</Text>
        </Flex>
      )}
      <Flex vertical gap={8} style={{ padding: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          {event.name}
        </Title>
      </Flex>
    </Flex>
  )
}

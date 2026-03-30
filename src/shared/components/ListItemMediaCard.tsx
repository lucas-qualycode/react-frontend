import { PictureOutlined } from '@ant-design/icons'
import { Card, Flex, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Text } = Typography

export type ListItemMediaCardProps = {
  title: string
  imageAlt: string
  imageSrc?: string | null
  imageHeight: number
  onClick?: () => void
  headerTrailing?: ReactNode
  footer?: ReactNode
  noImageText: string
}

export function ListItemMediaCard({
  title,
  imageAlt,
  imageSrc,
  imageHeight,
  onClick,
  headerTrailing,
  footer,
  noImageText,
}: ListItemMediaCardProps) {
  const trimmed = imageSrc?.trim() ?? ''

  return (
    <Card hoverable styles={{ body: { padding: 0 } }} onClick={onClick}>
      <Flex vertical>
        <Flex justify="space-between" align="center" gap={12} style={{ padding: '12px 24px' }}>
          <Text strong ellipsis style={{ flex: 1, minWidth: 0 }}>
            {title}
          </Text>
          {headerTrailing ? (
            <Flex align="center" gap={8} wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
              {headerTrailing}
            </Flex>
          ) : null}
        </Flex>
        <div style={{ width: '100%', height: imageHeight, overflow: 'hidden' }}>
          {trimmed ? (
            <img
              src={trimmed}
              alt={imageAlt}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <Flex
              vertical
              align="center"
              justify="center"
              gap={8}
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--ant-color-bg-elevated)',
                borderTop: '1px dashed var(--ant-color-border)',
                padding: 16,
                boxSizing: 'border-box',
              }}
            >
              <PictureOutlined
                style={{ fontSize: 40, color: 'var(--ant-color-text-quaternary)' }}
                aria-hidden
              />
              <Text type="secondary" style={{ textAlign: 'center' }}>
                {noImageText}
              </Text>
            </Flex>
          )}
        </div>
        {footer ?? null}
      </Flex>
    </Card>
  )
}

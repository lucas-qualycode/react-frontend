import { Flex, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Title, Text } = Typography

export type PageHeaderRowProps = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export function PageHeaderRow({ title, subtitle, actions }: PageHeaderRowProps) {
  return (
    <Flex align="flex-start" justify="space-between" gap={16} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
      <div>
        {typeof title === 'string' ? (
          <Title level={2} style={{ marginBottom: 0 }}>
            {title}
          </Title>
        ) : (
          title
        )}
        {subtitle != null ? (
          typeof subtitle === 'string' ? (
            <Text type="secondary">{subtitle}</Text>
          ) : (
            subtitle
          )
        ) : null}
      </div>
      {actions ? (
        <Flex align="center" gap={8} wrap="wrap" style={{ flexShrink: 0 }}>
          {actions}
        </Flex>
      ) : null}
    </Flex>
  )
}

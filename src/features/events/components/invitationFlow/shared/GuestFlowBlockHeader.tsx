import { Typography } from 'antd'
import type { ReactNode } from 'react'
import './eventGuestFlowBlockHeader.css'

const { Title, Text } = Typography

type Props = {
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
}

export function GuestFlowBlockHeader({ icon, title, subtitle }: Props) {
  return (
    <div className="guest-flow-block-header">
      <div className="guest-flow-block-header-title-row">
        <span className="guest-flow-block-header-icon" aria-hidden>
          {icon}
        </span>
        <Title level={3} className="guest-flow-block-header-title">
          {title}
        </Title>
      </div>
      {subtitle != null ? (
        <Text type="secondary" className="guest-flow-block-header-subtitle">
          {subtitle}
        </Text>
      ) : null}
    </div>
  )
}

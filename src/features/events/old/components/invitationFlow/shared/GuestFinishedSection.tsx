import { EditOutlined } from '@ant-design/icons'
import { Button, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Title } = Typography

type Props = {
  id: string
  icon: ReactNode
  title: string
  count?: number
  editLabel?: string
  onEdit?: () => void
  children: ReactNode
}

export function GuestFinishedSection({
  id,
  icon,
  title,
  count,
  editLabel,
  onEdit,
  children,
}: Props) {
  return (
    <section className="guest-finished-section" aria-labelledby={id}>
      <div className="guest-finished-section-card">
        <div className="guest-finished-section-head">
          <span className="guest-finished-section-icon" aria-hidden>
            {icon}
          </span>
          <Title level={5} id={id} className="guest-finished-section-title">
            {title}
          </Title>
          {count !== undefined || onEdit ? (
            <div className="guest-finished-section-head-trailing">
              {count !== undefined ? (
                <span className="guest-finished-section-count">{count}</span>
              ) : null}
              {onEdit && editLabel ? (
                <Tooltip title={editLabel} placement="top">
                  <Button
                    type="text"
                    size="small"
                    className="guest-finished-section-edit-btn"
                    icon={<EditOutlined />}
                    aria-label={editLabel}
                    onClick={onEdit}
                  />
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="guest-finished-section-divider" role="presentation" />
        <div className="guest-finished-section-body">{children}</div>
      </div>
    </section>
  )
}

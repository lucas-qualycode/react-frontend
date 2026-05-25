import { EditOutlined } from '@ant-design/icons'
import { Button, Card, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Title } = Typography

type Props = {
  id: string
  icon: ReactNode
  title: string
  titleExtra?: ReactNode
  editLabel?: string
  onEdit?: () => void
  children: ReactNode
}

export function GuestReviewSection({
  id,
  icon,
  title,
  titleExtra,
  editLabel,
  onEdit,
  children,
}: Props) {
  return (
    <section className="guest-review-section" aria-labelledby={id}>
      <Card size="small" className="guest-review-section-card">
        <div className="guest-review-section-head">
          <span className="guest-review-section-icon" aria-hidden>
            {icon}
          </span>
          <Title level={5} id={id} className="guest-review-section-title">
            {title}
          </Title>
          {titleExtra || onEdit ? (
            <div className="guest-review-section-head-trailing">
              {titleExtra ? (
                <div className="guest-review-section-title-extra">{titleExtra}</div>
              ) : null}
              {onEdit ? (
                <Tooltip title={editLabel} placement="top">
                  <Button
                    type="text"
                    size="small"
                    className="guest-review-section-edit-btn"
                    icon={<EditOutlined />}
                    aria-label={editLabel}
                    onClick={onEdit}
                  />
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="guest-review-section-divider" role="presentation" />
        <div className="guest-review-section-body">{children}</div>
      </Card>
    </section>
  )
}

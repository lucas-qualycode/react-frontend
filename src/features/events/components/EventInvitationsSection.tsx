import { PlusOutlined } from '@ant-design/icons'
import { Button, Col, Empty, Flex, Grid, Row, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { ListItemMediaCard } from '@/shared/components/ListItemMediaCard'
import type { Invitation, InvitationStatus } from '@/shared/types/api'
import { useEventInvitations, useInvitation } from '../hooks'

function InvitationSlotsExpand({ invitationId }: { invitationId: string }) {
  const { t } = useTranslation()
  const { data, isLoading } = useInvitation(invitationId)
  if (isLoading) return <Spin size="small" />
  const slots = data?.guest_slots ?? []
  if (slots.length === 0) {
    return <Typography.Text type="secondary">{t('events.invitations.noGuestSlots')}</Typography.Text>
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {slots.map((s) => (
        <li key={s.id}>
          <Typography.Text>
            {s.first_name}
            {s.required_field_ids.length > 0 ? ` — ${s.required_field_ids.join(', ')}` : ''}
          </Typography.Text>
        </li>
      ))}
    </ul>
  )
}

type EventInvitationsSectionProps = {
  eventId: string | undefined
  mode: 'create' | 'edit'
}

function invitationTitle(inv: Invitation): string {
  const namePart = (inv.name ?? '').trim()
  const destPart = (inv.destination ?? '').trim()
  return namePart || destPart || inv.id
}

function formatExpiresAt(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) {
    return (iso ?? '').trim() || '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms))
}

function statusTagColor(status: InvitationStatus): string {
  switch (status) {
    case 'ACCEPTED':
      return 'success'
    case 'DECLINED':
      return 'error'
    case 'EXPIRED':
      return 'warning'
    case 'CANCELLED':
      return 'default'
    case 'SENT':
      return 'processing'
    default:
      return 'default'
  }
}

export function EventInvitationsSection({ eventId, mode }: EventInvitationsSectionProps) {
  const { t } = useTranslation()
  const [, setSearchParams] = useSearchParams()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const { xs } = screens
  const { data: invitations = [], isLoading } = useEventInvitations(
    mode === 'edit' ? eventId : undefined,
  )

  const goToEditInvitation = useCallback(
    (invitationId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('section', 'invitation-edit')
          next.set('invitation', invitationId)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const goToCreateInvitation = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('section', 'invitation-new')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const columns: ColumnsType<Invitation> = useMemo(
    () => [
      {
        title: t('events.invitations.colName'),
        key: 'name',
        ellipsis: true,
        render: (_, inv) => invitationTitle(inv),
      },
      {
        title: t('events.invitations.colGuestSlots'),
        key: 'guest_slot_count',
        width: 96,
        render: (_, inv) => {
          const n = inv.guest_slot_count ?? 0
          return n > 0 ? String(n) : '—'
        },
      },
      {
        title: t('events.invitations.colStatus'),
        key: 'status',
        width: 130,
        render: (_, inv) => <Tag color={statusTagColor(inv.status)}>{inv.status}</Tag>,
      },
      {
        title: t('events.invitations.colExpiresAt'),
        key: 'expires_at',
        width: 180,
        ellipsis: true,
        render: (_, inv) => formatExpiresAt(inv.expires_at),
      },
    ],
    [t],
  )

  if (mode !== 'edit' || !eventId) {
    return (
      <Typography.Text type="secondary" style={{ display: 'block' }}>
        {t('events.form.invitationsAfterCreateHint')}
      </Typography.Text>
    )
  }

  return (
    <div className="event-form-section-panel" style={{ width: '100%' }}>
      <Flex
        justify="space-between"
        align="center"
        gap={16}
        wrap="wrap"
        style={{ marginBottom: 8 }}
      >
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 0, flex: '1 1 auto' }}>
          {t('events.invitations.sectionTitle')}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={goToCreateInvitation}>
          {t('events.invitations.createButton')}
        </Button>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t('events.invitations.sectionIntro')}
      </Typography.Paragraph>
      {isLoading ? (
        <Spin />
      ) : useCardLayout ? (
        invitations.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('events.invitations.tableEmpty')} />
        ) : (
          <Row gutter={[16, 16]}>
            {invitations.map((inv) => {
              const title = invitationTitle(inv)
              const imageHeight = xs ? 140 : 160
              const expiresLabel = formatExpiresAt(inv.expires_at)
              return (
                <Col key={inv.id} span={24}>
                  <ListItemMediaCard
                    title={title}
                    imageAlt={title}
                    imageSrc={undefined}
                    imageHeight={imageHeight}
                    onClick={() => goToEditInvitation(inv.id)}
                    noImageText={t('events.detail.noImage')}
                    headerTrailing={
                      <Tag color={statusTagColor(inv.status)}>{inv.status}</Tag>
                    }
                    footer={
                      <Flex vertical gap={4} style={{ padding: '12px 24px 24px' }}>
                        {(inv.guest_slot_count ?? 0) > 0 ? (
                          <Typography.Text type="secondary" ellipsis>
                            {t('events.invitations.colGuestSlots')}: {inv.guest_slot_count}
                          </Typography.Text>
                        ) : null}
                        <Typography.Text type="secondary" ellipsis>
                          {t('events.invitations.colExpiresAt')}: {expiresLabel}
                        </Typography.Text>
                      </Flex>
                    }
                  />
                </Col>
              )
            })}
          </Row>
        )
      ) : (
        <Table<Invitation>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={invitations}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('events.invitations.tableEmpty') }}
          expandable={{
            rowExpandable: (record) => (record.guest_slot_count ?? 0) > 0,
            expandedRowRender: (record) => (
              <div style={{ padding: '4px 0 8px' }}>
                <InvitationSlotsExpand invitationId={record.id} />
              </div>
            ),
          }}
          onRow={(record) => ({
            onClick: () => goToEditInvitation(record.id),
            style: { cursor: 'pointer' },
          })}
        />
      )}
    </div>
  )
}

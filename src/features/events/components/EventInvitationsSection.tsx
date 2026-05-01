import { PlusOutlined } from '@ant-design/icons'
import { Button, Col, Empty, Flex, Grid, Row, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { ListItemMediaCard } from '@/shared/components/ListItemMediaCard'
import type { Invitation, InvitationStatus } from '@/shared/types/api'
import { useEventInvitations, useFieldDefinitions } from '../hooks'

type GuestSlotTableRow = {
  id: string
  isGuestSlot: true
  parentInvitationId: string
  first_name: string
  fieldsDisplay: string
}

type InvitationTreeRow = Invitation & {
  children?: GuestSlotTableRow[]
}

function isGuestSlotRow(r: InvitationTreeRow | GuestSlotTableRow): r is GuestSlotTableRow {
  return 'isGuestSlot' in r && r.isGuestSlot === true
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

function guestSlotSummaryLines(inv: Invitation, labelByFieldId: Map<string, string>) {
  const slots = inv.guest_slots ?? []
  return slots.map((s) => {
    const name = (s.first_name ?? '').trim()
    const labels = (s.required_field_ids ?? []).map(
      (id) => labelByFieldId.get(id)?.trim() || id,
    )
    const fields = labels.length > 0 ? labels.join(', ') : ''
    let line = ''
    if (name && fields) line = `${name} — ${fields}`
    else if (name) line = name
    else if (fields) line = fields
    return { key: s.id, line }
  })
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
  const { data: fieldDefinitions = [], isLoading: definitionsLoading } = useFieldDefinitions(true)

  const labelByFieldId = useMemo(
    () => new Map(fieldDefinitions.map((d) => [d.id, d.label])),
    [fieldDefinitions],
  )

  const invitationTableData = useMemo((): InvitationTreeRow[] => {
    return invitations.map((inv): InvitationTreeRow => {
      const slots = inv.guest_slots ?? []
      const children: GuestSlotTableRow[] | undefined =
        slots.length > 0
          ? slots.map((s) => ({
              id: s.id,
              isGuestSlot: true as const,
              parentInvitationId: inv.id,
              first_name: (s.first_name ?? '').trim(),
              fieldsDisplay: (s.required_field_ids ?? [])
                .map((id) => labelByFieldId.get(id)?.trim() || id)
                .join(', '),
            }))
          : undefined
      return {
        ...inv,
        children: children && children.length > 0 ? children : undefined,
      }
    })
  }, [invitations, labelByFieldId])

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

  const columns: ColumnsType<InvitationTreeRow | GuestSlotTableRow> = useMemo(
    () => [
      {
        title: t('events.invitations.colName'),
        key: 'name',
        ellipsis: true,
        render: (_, record) =>
          isGuestSlotRow(record) ? record.first_name || null : invitationTitle(record),
      },
      {
        title: t('events.invitations.colGuestSlots'),
        key: 'guest_slot_count',
        width: 140,
        render: (_, record) =>
          isGuestSlotRow(record)
            ? record.fieldsDisplay || null
            : (record.guest_slot_count ?? 0) > 0
              ? String(record.guest_slot_count)
              : '—',
      },
      {
        title: t('events.invitations.colStatus'),
        key: 'status',
        width: 130,
        render: (_, record) =>
          isGuestSlotRow(record) ? null : (
            <Tag color={statusTagColor(record.status)}>{record.status}</Tag>
          ),
      },
      {
        title: t('events.invitations.colExpiresAt'),
        key: 'expires_at',
        width: 180,
        ellipsis: true,
        render: (_, record) =>
          isGuestSlotRow(record) ? null : formatExpiresAt(record.expires_at),
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

  const listBusy = isLoading || definitionsLoading

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
      {listBusy ? (
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
              const slotLines = guestSlotSummaryLines(inv, labelByFieldId)
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
                        {slotLines.some((x) => x.line) ? (
                          <Flex vertical gap={2}>
                            {slotLines
                              .filter((x) => x.line)
                              .map(({ key, line }) => (
                                <Typography.Text key={key} type="secondary" style={{ fontSize: 12 }}>
                                  {line}
                                </Typography.Text>
                              ))}
                          </Flex>
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
        <Table<InvitationTreeRow | GuestSlotTableRow>
          rowKey={(r) => (isGuestSlotRow(r) ? `guest-${r.id}` : r.id)}
          size="small"
          columns={columns}
          dataSource={invitationTableData}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('events.invitations.tableEmpty') }}
          onRow={(record) => ({
            onClick: () =>
              goToEditInvitation(
                isGuestSlotRow(record) ? record.parentInvitationId : record.id,
              ),
            style: { cursor: 'pointer' },
          })}
        />
      )}
    </div>
  )
}

import { LinkOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Col, Empty, Flex, Grid, Row, Spin, Table, Tag, Tooltip, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  eventEditInvitationEditPath,
  eventEditInvitationNewPath,
} from '@/features/events/edit/eventEditTabs'
import { ListItemMediaCard } from '@/shared/components/ListItemMediaCard'
import type { Invitation, InvitationStatus } from '@/shared/types/api'
import {
  getStoredInvitationAccessToken,
  guestInvitationHref,
  setStoredInvitationAccessToken,
} from '@/features/events/lib/invitationAccessStorage'
import { useEventInvitations, useFieldDefinitions, useRegenerateInvitationAccessToken } from '@/features/events/hooks'

type SpotTableRow = {
  id: string
  isSpot: true
  parentInvitationId: string
  name: string
  fieldsDisplay: string
}

type InvitationTreeRow = Invitation & {
  children?: SpotTableRow[]
}

function isSpotRow(r: InvitationTreeRow | SpotTableRow): r is SpotTableRow {
  return 'isSpot' in r && r.isSpot === true
}

type EventInvitationsSectionProps = {
  eventId: string
  onCreate?: () => void
  onEdit?: (invitationId: string) => void
}

function invitationTitle(inv: Invitation): string {
  const namePart = (inv.name ?? '').trim()
  const destPart = (inv.destination ?? '').trim()
  return namePart || destPart || inv.id
}

const MS_PER_DAY = 86400000

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

function expiresAtVisualState(iso: string): 'expired' | 'soon' | 'normal' {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return 'normal'
  const now = Date.now()
  if (ms <= now) return 'expired'
  if (ms - now <= MS_PER_DAY) return 'soon'
  return 'normal'
}

function expiresAtDisplayStyle(state: ReturnType<typeof expiresAtVisualState>): CSSProperties | undefined {
  if (state === 'expired') return { color: 'var(--ant-color-error)' }
  if (state === 'soon') return { color: 'var(--ant-color-warning)' }
  return undefined
}

function invitationStatusLabel(t: (key: string, opts?: { defaultValue?: string }) => string, status: InvitationStatus) {
  return t(`events.invitations.status.${status}`, { defaultValue: status })
}

function statusTagColor(status: InvitationStatus): string {
  switch (status) {
    case 'ACCEPTED':
      return 'success'
    case 'DECLINED':
      return 'error'
    case 'CANCELLED':
      return 'default'
    case 'SENT':
      return 'processing'
    default:
      return 'default'
  }
}

function spotSummaryLines(inv: Invitation, labelByFieldId: Map<string, string>) {
  const slots = inv.spots ?? []
  return slots.map((s) => {
    const name = (s.name ?? '').trim()
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

export function EventInvitationsSection({ eventId, onCreate, onEdit }: EventInvitationsSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const { xs } = screens
  const { data: invitations = [], isLoading } = useEventInvitations(eventId)
  const { data: fieldDefinitions = [], isLoading: definitionsLoading } = useFieldDefinitions(true)
  const regenerateTokenMutation = useRegenerateInvitationAccessToken(eventId)
  const [accessTokenByInvitationId, setAccessTokenByInvitationId] = useState<Record<string, string>>(
    {},
  )
  const [refreshingInvitationId, setRefreshingInvitationId] = useState<string | null>(null)

  useEffect(() => {
    if (invitations.length === 0) return
    setAccessTokenByInvitationId((prev) => {
      const next = { ...prev }
      let changed = false
      for (const inv of invitations) {
        if (next[inv.id]) continue
        const stored = getStoredInvitationAccessToken(inv.id)
        if (stored) {
          next[inv.id] = stored
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [invitations])

  const getAccessToken = useCallback(
    (invitationId: string) => accessTokenByInvitationId[invitationId] ?? null,
    [accessTokenByInvitationId],
  )

  const labelByFieldId = useMemo(
    () => new Map(fieldDefinitions.map((d) => [d.id, d.label])),
    [fieldDefinitions],
  )

  const invitationTableData = useMemo((): InvitationTreeRow[] => {
    return invitations.map((inv): InvitationTreeRow => {
      const slots = inv.spots ?? []
      const children: SpotTableRow[] | undefined =
        slots.length > 0
          ? slots.map((s) => ({
              id: s.id,
              isSpot: true as const,
              parentInvitationId: inv.id,
              name: (s.name ?? '').trim(),
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
      if (onEdit) {
        onEdit(invitationId)
        return
      }
      navigate(eventEditInvitationEditPath(eventId, invitationId))
    },
    [eventId, navigate, onEdit],
  )

  const openGuestInvitation = useCallback(
    (invitationId: string) => {
      if (!eventId) return
      const token = getAccessToken(invitationId)
      if (!token) {
        message.warning(t('events.invitations.linkNeedsToken'))
        return
      }
      const path = guestInvitationHref(eventId, invitationId, token)
      window.open(`${window.location.origin}${path}`, '_blank', 'noopener,noreferrer')
    },
    [eventId, getAccessToken, t],
  )

  const refreshGuestLink = useCallback(
    async (invitationId: string) => {
      setRefreshingInvitationId(invitationId)
      try {
        const { access_token } = await regenerateTokenMutation.mutateAsync(invitationId)
        setStoredInvitationAccessToken(invitationId, access_token)
        setAccessTokenByInvitationId((prev) => ({ ...prev, [invitationId]: access_token }))
        if (eventId) {
          const url = `${window.location.origin}${guestInvitationHref(eventId, invitationId, access_token)}`
          try {
            await navigator.clipboard.writeText(url)
            message.success(t('events.invitations.refreshLinkSuccess'))
          } catch {
            message.success(t('events.invitations.refreshLinkSuccess'))
          }
        }
      } catch (e) {
        message.error(
          e instanceof Error ? e.message : t('events.invitations.refreshLinkFailed'),
        )
      } finally {
        setRefreshingInvitationId(null)
      }
    },
    [eventId, regenerateTokenMutation, t],
  )

  const goToCreateInvitation = useCallback(() => {
    if (onCreate) {
      onCreate()
      return
    }
    navigate(eventEditInvitationNewPath(eventId))
  }, [eventId, navigate, onCreate])

  const columns: ColumnsType<InvitationTreeRow | SpotTableRow> = useMemo(
    () => [
      {
        title: t('events.invitations.colName'),
        key: 'name',
        ellipsis: true,
        render: (_, record) =>
          isSpotRow(record) ? record.name || null : invitationTitle(record),
      },
      {
        title: t('events.invitations.colSpots'),
        key: 'spot_count',
        width: 140,
        render: (_, record) =>
          isSpotRow(record)
            ? record.fieldsDisplay || null
            : (record.spot_count ?? 0) > 0
              ? String(record.spot_count)
              : '—',
      },
      {
        title: t('events.invitations.colStatus'),
        key: 'status',
        width: 130,
        render: (_, record) =>
          isSpotRow(record) ? null : (
            <Tag color={statusTagColor(record.status)}>
              {invitationStatusLabel(t, record.status)}
            </Tag>
          ),
      },
      {
        title: t('events.invitations.colExpiresAt'),
        key: 'expires_at',
        width: 180,
        ellipsis: true,
        render: (_, record) =>
          isSpotRow(record) ? null : (
            <Typography.Text
              ellipsis
              style={expiresAtDisplayStyle(expiresAtVisualState(record.expires_at))}
            >
              {formatExpiresAt(record.expires_at)}
            </Typography.Text>
          ),
      },
      {
        title: t('events.invitations.colLink'),
        key: 'link',
        width: 96,
        align: 'center',
        render: (_, record) =>
          isSpotRow(record) ? null : (
            <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 4 }}>
              <Tooltip
                title={
                  getAccessToken(record.id)
                    ? t('events.invitations.openGuestLink')
                    : t('events.invitations.linkNeedsToken')
                }
                placement="bottom"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  aria-label={t('events.invitations.openGuestLink')}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openGuestInvitation(record.id)
                  }}
                />
              </Tooltip>
              <Tooltip title={t('events.invitations.refreshLink')} placement="bottom">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  aria-label={t('events.invitations.refreshLink')}
                  loading={refreshingInvitationId === record.id}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void refreshGuestLink(record.id)
                  }}
                />
              </Tooltip>
            </span>
          ),
      },
    ],
    [t, openGuestInvitation, refreshGuestLink, getAccessToken, refreshingInvitationId],
  )

  if (!eventId) {
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
          {t('events.form.addButton')}
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
              const expiresExp = expiresAtVisualState(inv.expires_at)
              const expiresStyle = expiresAtDisplayStyle(expiresExp)
              const spotLines = spotSummaryLines(inv, labelByFieldId)
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
                      <>
                        <Tag color={statusTagColor(inv.status)}>
                          {invitationStatusLabel(t, inv.status)}
                        </Tag>
                        <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 4 }}>
                          <Tooltip
                            title={
                              getAccessToken(inv.id)
                                ? t('events.invitations.openGuestLink')
                                : t('events.invitations.linkNeedsToken')
                            }
                            placement="bottom"
                          >
                            <Button
                              type="text"
                              icon={<LinkOutlined />}
                              aria-label={t('events.invitations.openGuestLink')}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                openGuestInvitation(inv.id)
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={t('events.invitations.refreshLink')} placement="bottom">
                            <Button
                              type="text"
                              icon={<ReloadOutlined />}
                              aria-label={t('events.invitations.refreshLink')}
                              loading={refreshingInvitationId === inv.id}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                void refreshGuestLink(inv.id)
                              }}
                            />
                          </Tooltip>
                        </span>
                      </>
                    }
                    footer={
                      <Flex vertical gap={4} style={{ padding: '12px 24px 24px' }}>
                        {(inv.spot_count ?? 0) > 0 ? (
                          <Typography.Text type="secondary" ellipsis>
                            {t('events.invitations.colSpots')}: {inv.spot_count}
                          </Typography.Text>
                        ) : null}
                        {spotLines.some((x) => x.line) ? (
                          <Flex vertical gap={2}>
                            {spotLines
                              .filter((x) => x.line)
                              .map(({ key, line }) => (
                                <Typography.Text key={key} type="secondary" style={{ fontSize: 12 }}>
                                  {line}
                                </Typography.Text>
                              ))}
                          </Flex>
                        ) : null}
                        <Typography.Text type="secondary" ellipsis>
                          {t('events.invitations.colExpiresAt')}:{' '}
                          <span style={expiresStyle}>{expiresLabel}</span>
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
        <Table<InvitationTreeRow | SpotTableRow>
          rowKey={(r) => (isSpotRow(r) ? `spot-${r.id}` : r.id)}
          size="small"
          columns={columns}
          dataSource={invitationTableData}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('events.invitations.tableEmpty') }}
          onRow={(record) => ({
            onClick: () =>
              goToEditInvitation(
                isSpotRow(record) ? record.parentInvitationId : record.id,
              ),
            style: { cursor: 'pointer' },
          })}
        />
      )}
    </div>
  )
}

import { AppstoreOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Card, Col, Flex, Row, Spin, Statistic, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  INVITATION_STATUSES,
  type Invitation,
  type InvitationStatus,
} from '@/shared/types/api'
import {
  MS_PER_DAY,
  daysUntilExpiry,
  isInvitationExpired,
  isInvitationExpiringWithin7Days,
} from '@/features/events/lib/invitationExpiry'
import { useEventInvitations } from '@/features/events/hooks'
import {
  eventEditInvitationCatalogPath,
  eventEditInvitationEditPath,
  eventEditInvitationGuestsPath,
  eventEditInvitationNewPath,
} from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

const { Text, Title } = Typography
const ATTENTION_LIMIT = 10
const STATUS_CHART_HEIGHT = 140

type AttentionReason = 'expired_pending' | 'expiring_soon'

type AttentionItem = {
  id: string
  name: string
  status: InvitationStatus
  expiresAt: string
  reason: AttentionReason
  sortKey: number
}

function buildMockAttentionItems(): AttentionItem[] {
  const now = Date.now()
  const expiresToday = new Date()
  expiresToday.setHours(23, 59, 0, 0)
  const expiresTomorrow = new Date()
  expiresTomorrow.setDate(expiresTomorrow.getDate() + 1)
  expiresTomorrow.setHours(12, 0, 0, 0)
  return [
    {
      id: 'mock-attention-1',
      name: 'Family invite — Silva',
      status: 'SENT',
      expiresAt: new Date(now - 2 * MS_PER_DAY).toISOString(),
      reason: 'expired_pending',
      sortKey: 0,
    },
    {
      id: 'mock-attention-2',
      name: 'Brunch table — Costa',
      status: 'SENT',
      expiresAt: expiresToday.toISOString(),
      reason: 'expiring_soon',
      sortKey: 1 + expiresToday.getTime(),
    },
    {
      id: 'mock-attention-3',
      name: 'Ceremony seats — Lima',
      status: 'CREATED',
      expiresAt: expiresTomorrow.toISOString(),
      reason: 'expiring_soon',
      sortKey: 1 + expiresTomorrow.getTime(),
    },
    {
      id: 'mock-attention-4',
      name: 'VIP guest list',
      status: 'CREATED',
      expiresAt: new Date(now + 3 * MS_PER_DAY).toISOString(),
      reason: 'expiring_soon',
      sortKey: 1 + now + 3 * MS_PER_DAY,
    },
    {
      id: 'mock-attention-5',
      name: 'Table 12 — Santos',
      status: 'SENT',
      expiresAt: new Date(now + 6 * MS_PER_DAY).toISOString(),
      reason: 'expiring_soon',
      sortKey: 1 + now + 6 * MS_PER_DAY,
    },
  ]
}

function isMockAttentionItem(id: string): boolean {
  return id.startsWith('mock-attention-')
}

function invitationLabel(inv: Invitation): string {
  const namePart = (inv.name ?? '').trim()
  const destPart = (inv.destination ?? '').trim()
  return namePart || destPart || inv.id
}

function formatExpiresAt(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return (iso ?? '').trim() || '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms))
}

function attentionReasonLabel(
  reason: AttentionReason,
  expiresAt: string,
  tp: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (reason === 'expired_pending') return tp('attentionReasonExpiredPending')
  const days = daysUntilExpiry(expiresAt)
  if (days === null) return tp('attentionReasonExpiresInDays', { count: 7 })
  if (days === 0) return tp('attentionReasonExpiresToday')
  if (days === 1) return tp('attentionReasonExpiresTomorrow')
  return tp('attentionReasonExpiresInDays', { count: days })
}

function isPendingStatus(status: InvitationStatus): boolean {
  return status === 'CREATED' || status === 'SENT'
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

function isUrgentExpiry(expiresAt: string): boolean {
  const days = daysUntilExpiry(expiresAt)
  return days !== null && days >= 0 && days <= 1
}

function attentionExpiryVisual(
  reason: AttentionReason,
  expiresAt: string,
): { tagColor: string; textColor: string } {
  if (reason === 'expired_pending' || isUrgentExpiry(expiresAt)) {
    return { tagColor: 'error', textColor: 'var(--ant-color-error)' }
  }
  const days = daysUntilExpiry(expiresAt)
  if (days !== null && days >= 5 && days <= 7) {
    return { tagColor: 'processing', textColor: 'var(--ant-color-info)' }
  }
  return { tagColor: 'warning', textColor: 'var(--ant-color-warning)' }
}

function statusBarFill(status: InvitationStatus): string {
  switch (status) {
    case 'ACCEPTED':
      return 'var(--ant-color-success)'
    case 'DECLINED':
      return 'var(--ant-color-error)'
    case 'SENT':
      return 'var(--ant-color-info)'
    case 'CANCELLED':
      return 'var(--ant-color-text-quaternary)'
    default:
      return 'var(--ant-color-text-tertiary)'
  }
}

function StatusBreakdownBars({
  counts,
  total,
  statusLabel,
  onStatusClick,
}: {
  counts: Record<InvitationStatus, number>
  total: number
  statusLabel: (status: InvitationStatus) => string
  onStatusClick?: (status: InvitationStatus) => void
}) {
  const maxCount = Math.max(...INVITATION_STATUSES.map((status) => counts[status]), 1)

  return (
    <Flex justify="center" style={{ width: '100%' }}>
      <Flex
        align="flex-end"
        justify="center"
        gap={16}
        style={{ paddingTop: 4 }}
      >
      {INVITATION_STATUSES.map((status) => {
        const count = counts[status]
        const percent = total > 0 ? Math.round((count / total) * 100) : 0
        const barHeight =
          count > 0 ? Math.max(16, Math.round((count / maxCount) * STATUS_CHART_HEIGHT)) : 0

        const clickable = !!onStatusClick
        return (
          <Flex
            key={status}
            vertical
            align="center"
            gap={6}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            style={{
              width: 72,
              flexShrink: 0,
              cursor: clickable ? 'pointer' : undefined,
            }}
            onClick={clickable ? () => onStatusClick(status) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onStatusClick(status)
                    }
                  }
                : undefined
            }
          >
            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>
              {percent}%
            </Text>
            <Text strong style={{ fontSize: 14, lineHeight: 1 }}>
              {count}
            </Text>
            <div
              style={{
                width: '100%',
                maxWidth: 44,
                height: STATUS_CHART_HEIGHT,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.04)',
                borderRadius: '6px 6px 0 0',
              }}
            >
              {barHeight > 0 ? (
                <div
                  style={{
                    width: '100%',
                    height: barHeight,
                    borderRadius: '6px 6px 0 0',
                    background: statusBarFill(status),
                  }}
                />
              ) : null}
            </div>
            <Tag
              color={statusTagColor(status)}
              style={{ margin: 0, fontSize: 11, maxWidth: '100%', textAlign: 'center' }}
            >
              <span
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {statusLabel(status)}
              </span>
            </Tag>
          </Flex>
        )
      })}
      </Flex>
    </Flex>
  )
}

export function EditInvitationsDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useEventEditContext()
  const tp = (key: string, options?: Record<string, unknown>) =>
    t(`events.invitations.${key}`, options)

  const { data: invitations = [], isLoading } = useEventInvitations(eventId)

  const guestCount = useMemo(
    () => invitations.reduce((sum, inv) => sum + (inv.spot_count ?? 0), 0),
    [invitations],
  )

  const statusCounts = useMemo(() => {
    const counts: Record<InvitationStatus, number> = {
      CREATED: 0,
      SENT: 0,
      ACCEPTED: 0,
      DECLINED: 0,
      CANCELLED: 0,
    }
    for (const inv of invitations) counts[inv.status] += 1
    return counts
  }, [invitations])

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = []
    for (const inv of invitations) {
      if (!isPendingStatus(inv.status)) continue
      const expired = isInvitationExpired(inv.expires_at)
      const expiringSoon = !expired && isInvitationExpiringWithin7Days(inv.expires_at)
      if (!expired && !expiringSoon) continue
      const expiresMs = Date.parse(inv.expires_at)
      items.push({
        id: inv.id,
        name: invitationLabel(inv),
        status: inv.status,
        expiresAt: inv.expires_at,
        reason: expired ? 'expired_pending' : 'expiring_soon',
        sortKey: expired ? 0 : 1 + (Number.isNaN(expiresMs) ? Number.MAX_SAFE_INTEGER : expiresMs),
      })
    }
    return items
      .sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name))
      .slice(0, ATTENTION_LIMIT)
  }, [invitations])

  const statusLabel = (status: InvitationStatus) =>
    t(`events.invitations.status.${status}`, { defaultValue: status })

  const totalInvitations = invitations.length
  const displayAttentionItems =
    attentionItems.length > 0 ? attentionItems : buildMockAttentionItems()

  return (
    <EditTabShell showSave={false}>
      <Flex vertical gap={24}>
        <div>
          <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {tp('dashboardTitle')}
          </Title>
          <Text type="secondary">{tp('dashboardIntro')}</Text>
        </div>

        <Flex wrap="wrap" gap={12}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(eventEditInvitationNewPath(eventId))}
          >
            {t('events.form.addButton')}
          </Button>
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => navigate(eventEditInvitationCatalogPath(eventId))}
          >
            {tp('subNavList')}
          </Button>
          <Button
            icon={<TeamOutlined />}
            onClick={() => navigate(eventEditInvitationGuestsPath(eventId))}
          >
            {tp('subNavGuests')}
          </Button>
        </Flex>

        {isLoading ? (
          <Spin />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card>
                  <Statistic title={tp('dashboardStatInvitations')} value={totalInvitations} />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card>
                  <Statistic title={tp('dashboardStatGuests')} value={guestCount} />
                </Card>
              </Col>
            </Row>

            <div>
              <Title level={5} style={{ marginTop: 0, textAlign: 'center' }}>
                {tp('dashboardStatusBreakdownTitle')}
              </Title>
              {totalInvitations === 0 ? (
                <Text type="secondary">{tp('tableEmpty')}</Text>
              ) : (
                <StatusBreakdownBars
                  counts={statusCounts}
                  total={totalInvitations}
                  statusLabel={statusLabel}
                  onStatusClick={(status) =>
                    navigate(eventEditInvitationCatalogPath(eventId, { status }))
                  }
                />
              )}
            </div>

            <div>
              <Title level={5} style={{ marginTop: 0 }}>
                {tp('dashboardNeedsAttentionTitle')}
              </Title>
              <Flex vertical gap={0} style={{ width: '100%' }}>
                <Flex
                  align="center"
                  gap={12}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <div style={{ flex: '2 1 140px', minWidth: 0 }}>{tp('colName')}</div>
                  <div style={{ flex: '1 1 120px', minWidth: 0 }}>{tp('dashboardAttentionColReason')}</div>
                  <div style={{ flex: '1 1 96px', minWidth: 0 }}>{tp('colStatus')}</div>
                  <div style={{ flex: '1 1 140px', minWidth: 0 }}>{tp('colExpiresAt')}</div>
                </Flex>
                {displayAttentionItems.map((row) => {
                  const isMock = isMockAttentionItem(row.id)
                  const expiryVisual = attentionExpiryVisual(row.reason, row.expiresAt)
                  return (
                    <Flex
                      key={row.id}
                      align="center"
                      gap={12}
                      role={isMock ? undefined : 'button'}
                      tabIndex={isMock ? undefined : 0}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        cursor: isMock ? 'default' : 'pointer',
                        opacity: isMock ? 0.72 : 1,
                      }}
                      onClick={
                        isMock
                          ? undefined
                          : () => navigate(eventEditInvitationEditPath(eventId, row.id))
                      }
                      onKeyDown={
                        isMock
                          ? undefined
                          : (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                navigate(eventEditInvitationEditPath(eventId, row.id))
                              }
                            }
                      }
                    >
                      <div style={{ flex: '2 1 140px', minWidth: 0 }}>
                        <Text ellipsis>{row.name}</Text>
                      </div>
                      <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                        <Tag color={expiryVisual.tagColor} style={{ margin: 0 }}>
                          {attentionReasonLabel(row.reason, row.expiresAt, tp)}
                        </Tag>
                      </div>
                      <div style={{ flex: '1 1 96px', minWidth: 0 }}>
                        <Text type="secondary">{statusLabel(row.status)}</Text>
                      </div>
                      <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                        <Text
                          type="secondary"
                          style={{ color: expiryVisual.textColor }}
                        >
                          {formatExpiresAt(row.expiresAt)}
                        </Text>
                      </div>
                    </Flex>
                  )
                })}
              </Flex>
            </div>
          </>
        )}
      </Flex>
    </EditTabShell>
  )
}

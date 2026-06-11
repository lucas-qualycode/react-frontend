import {
  CaretDownOutlined,
  CaretUpOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Col,
  Empty,
  Flex,
  Grid,
  Modal,
  Row,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ListFilterToolbar } from '@/features/events/edit/components/ListFilterToolbar'
import {
  eventEditInvitationEditPath,
  eventEditInvitationGuestsPath,
  eventEditInvitationNewPath,
} from '@/features/events/edit/eventEditTabs'
import { ListItemMediaCard } from '@/shared/components/ListItemMediaCard'
import {
  isInvitationExpired,
  isInvitationExpiringWithin7Days,
} from '@/features/events/lib/invitationExpiry'
import {
  INVITATION_STATUSES,
  type Invitation,
  type InvitationStatus,
  type Product,
} from '@/shared/types/api'
import {
  getStoredInvitationAccessToken,
  guestInvitationHref,
  setStoredInvitationAccessToken,
} from '@/features/events/lib/invitationAccessStorage'
import {
  useEventInvitations,
  useEventMerchProducts,
  useEventTicketProducts,
  useRegenerateInvitationAccessToken,
} from '@/features/events/hooks'
const brl = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })
const MS_PER_DAY = 86400000
const PRODUCT_IMAGE_HEIGHT = 200
const INVITATION_IMAGE_HEIGHT = 160

const { Text } = Typography
const FILTER_ALL = '__all__'
const FILTER_EXPIRING_7 = '7'
const FILTER_EXPIRED = 'expired'

type MerchSectionProps = {
  variant?: 'merchandise'
  eventId: string
  onMerchCreate: () => void
  onMerchEdit: (productId: string) => void
  onMerchViewSales?: (productId: string) => void
}

type TicketSectionProps = {
  variant: 'ticket'
  eventId: string
  onTicketCreate: () => void
  onTicketEdit: (productId: string) => void
  onTicketViewSales?: (productId: string) => void
}

type InvitationSectionProps = {
  variant: 'invitation'
  eventId: string
  onCreate?: () => void
  onEdit?: (invitationId: string) => void
}

export type EventManageListSectionProps =
  | MerchSectionProps
  | TicketSectionProps
  | InvitationSectionProps

type SortDirection = 'asc' | 'desc'

type ListColumnDef<T> = {
  key: string
  title: string
  flex: string
  align?: 'left' | 'center' | 'right'
  stopRowClick?: boolean
  render: (item: T) => ReactNode
}

type InvitationSortKey = 'name' | 'spots' | 'status' | 'expires'

const INVITATION_SORTABLE_COLUMNS: InvitationSortKey[] = ['name', 'spots', 'status', 'expires']

function compareInvitations(
  a: Invitation,
  b: Invitation,
  sortKey: InvitationSortKey,
  sortDirection: SortDirection,
): number {
  const dir = sortDirection === 'asc' ? 1 : -1
  let cmp = 0
  switch (sortKey) {
    case 'name':
      cmp = invitationTitle(a).localeCompare(invitationTitle(b))
      break
    case 'spots':
      cmp = (a.spot_count ?? 0) - (b.spot_count ?? 0)
      break
    case 'status':
      cmp =
        INVITATION_STATUSES.indexOf(a.status) - INVITATION_STATUSES.indexOf(b.status)
      break
    case 'expires': {
      const aMs = Date.parse(a.expires_at)
      const bMs = Date.parse(b.expires_at)
      const aVal = Number.isNaN(aMs) ? Number.POSITIVE_INFINITY : aMs
      const bVal = Number.isNaN(bMs) ? Number.POSITIVE_INFINITY : bMs
      cmp = aVal - bVal
      break
    }
  }
  return cmp * dir
}

function formatPriceMinorUnits(minor: number): string {
  return brl.format(minor / 100)
}

function productPriceLabel(row: Product, tp: (key: string) => string): string {
  return row.is_free ? tp('free') : formatPriceMinorUnits(row.value)
}

function productStockLabel(row: Product): string {
  const available = row.inventory?.available_quantity
  return available !== undefined ? `${available} / ${row.quantity}` : String(row.quantity)
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

function invitationStatusLabel(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  status: InvitationStatus,
) {
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

function columnCellStyle(flex: string, align?: 'left' | 'center' | 'right'): CSSProperties {
  return {
    flex,
    minWidth: 0,
    textAlign: align ?? 'left',
  }
}

function ShrinkableColumnList<T>({
  items,
  columns,
  rowKey,
  onRowClick,
  sortKey,
  sortDirection,
  onSortChange,
  sortableColumnKeys,
}: {
  items: T[]
  columns: ListColumnDef<T>[]
  rowKey: (item: T) => string
  onRowClick?: (item: T) => void
  sortKey?: string | null
  sortDirection?: SortDirection
  onSortChange?: (key: string) => void
  sortableColumnKeys?: readonly string[]
}) {
  const sortableKeys = useMemo(() => new Set(sortableColumnKeys ?? []), [sortableColumnKeys])

  return (
    <div style={{ width: '100%' }}>
      <Flex
        align="center"
        gap={12}
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--ant-color-border-secondary)',
        }}
      >
        {columns.map((col) => {
          const isSortable = sortableKeys.has(col.key) && !!onSortChange
          const isActive = sortKey === col.key
          return (
            <div
              key={col.key}
              role={isSortable ? 'button' : undefined}
              tabIndex={isSortable ? 0 : undefined}
              style={{
                ...columnCellStyle(col.flex, col.align),
                cursor: isSortable ? 'pointer' : undefined,
                userSelect: isSortable ? 'none' : undefined,
              }}
              onClick={isSortable ? () => onSortChange(col.key) : undefined}
              onKeyDown={
                isSortable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSortChange(col.key)
                      }
                    }
                  : undefined
              }
            >
              <Flex
                align="center"
                gap={4}
                justify={
                  col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start'
                }
              >
                <Text
                  type="secondary"
                  style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}
                >
                  {col.title}
                </Text>
                {isSortable && isActive ? (
                  sortDirection === 'asc' ? (
                    <CaretUpOutlined style={{ fontSize: 10, color: 'var(--ant-color-text-secondary)' }} />
                  ) : (
                    <CaretDownOutlined style={{ fontSize: 10, color: 'var(--ant-color-text-secondary)' }} />
                  )
                ) : null}
              </Flex>
            </div>
          )
        })}
      </Flex>
      {items.map((item) => (
        <Flex
          key={rowKey(item)}
          align="center"
          gap={12}
          onClick={onRowClick ? () => onRowClick(item) : undefined}
          style={{
            padding: '12px',
            borderBottom: '1px solid var(--ant-color-border-secondary)',
            cursor: onRowClick ? 'pointer' : undefined,
          }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              style={columnCellStyle(col.flex, col.align)}
              onClick={col.stopRowClick ? (e) => e.stopPropagation() : undefined}
            >
              {col.render(item)}
            </div>
          ))}
        </Flex>
      ))}
    </div>
  )
}

type SectionShellProps = {
  title: string
  intro: string
  onAdd: () => void
  addLabel: string
  loading: boolean
  empty: boolean
  emptyText: string
  toolbar?: ReactNode
  filterEmpty?: boolean
  filterEmptyText?: string
  children: ReactNode
}

function SectionShell({
  title,
  intro,
  onAdd,
  addLabel,
  loading,
  empty,
  emptyText,
  toolbar,
  filterEmpty,
  filterEmptyText,
  children,
}: SectionShellProps) {
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
          {title}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          {addLabel}
        </Button>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {intro}
      </Typography.Paragraph>
      {toolbar}
      {loading ? (
        <Spin />
      ) : empty ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      ) : filterEmpty ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filterEmptyText} />
      ) : (
        children
      )}
    </div>
  )
}

function ProductCards({
  products,
  ns,
  tp,
  t,
  onEdit,
  onDelete,
  onViewSales,
}: {
  products: Product[]
  ns: 'events.products' | 'events.tickets'
  tp: (key: string) => string
  t: (key: string, opts?: Record<string, unknown>) => string
  onEdit: (product: Product) => void
  onDelete?: (productId: string) => void
  onViewSales?: (productId: string) => void
}) {
  const { xs } = Grid.useBreakpoint()
  const imageHeight = xs ? 180 : PRODUCT_IMAGE_HEIGHT

  return (
    <Row gutter={[16, 16]}>
      {products.map((row) => (
        <Col key={row.id} span={24}>
          <ListItemMediaCard
            title={row.name}
            imageAlt={row.name}
            imageSrc={row.imageURL}
            imageHeight={imageHeight}
            onClick={() => onEdit(row)}
            noImageText={t('events.detail.noImage')}
            headerTrailing={
              <>
                <Tag color={row.active ? 'green' : 'default'}>
                  {row.active ? t('userEvents.badgeActive') : t('userEvents.badgeInactive')}
                </Tag>
                <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                  <Tooltip title={tp('edit')} placement="bottom">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      aria-label={tp('edit')}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onEdit(row)
                      }}
                    />
                  </Tooltip>
                  {onViewSales ? (
                    <Tooltip title={tp('viewSales')} placement="bottom">
                      <Button
                        type="text"
                        icon={<DollarOutlined />}
                        aria-label={tp('viewSales')}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onViewSales(row.id)
                        }}
                      />
                    </Tooltip>
                  ) : null}
                  {onDelete ? (
                    <Tooltip title={tp('delete')} placement="bottom">
                      <span>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={tp('delete')}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDelete(row.id)
                          }}
                        />
                      </span>
                    </Tooltip>
                  ) : null}
                </span>
              </>
            }
            footer={
              <Flex wrap="wrap" align="center" gap={4} style={{ padding: '12px 24px 24px' }}>
                <Text type="secondary">
                  {tp('colPrice')}: {productPriceLabel(row, tp)}
                </Text>
                <Text type="secondary" style={{ userSelect: 'none', opacity: 0.55 }}>
                  ·
                </Text>
                <Text type="secondary">
                  {t(`${ns}.cardStockSlash`, {
                    available:
                      row.inventory?.available_quantity !== undefined
                        ? row.inventory.available_quantity
                        : '—',
                    total: row.quantity,
                  })}
                </Text>
              </Flex>
            }
          />
        </Col>
      ))}
    </Row>
  )
}

function ProductColumnList({
  products,
  tp,
  t,
  onEdit,
  onDelete,
  onViewSales,
}: {
  products: Product[]
  tp: (key: string) => string
  t: (key: string) => string
  onEdit: (product: Product) => void
  onDelete?: (productId: string) => void
  onViewSales?: (productId: string) => void
}) {
  const columns = useMemo((): ListColumnDef<Product>[] => {
    const base: ListColumnDef<Product>[] = [
      {
        key: 'name',
        title: tp('colName'),
        flex: '2 1 140px',
        render: (row) => <Text ellipsis>{row.name}</Text>,
      },
      {
        key: 'price',
        title: tp('colPrice'),
        flex: '1 1 88px',
        render: (row) => productPriceLabel(row, tp),
      },
      {
        key: 'stock',
        title: tp('colStock'),
        flex: '1 1 100px',
        render: (row) => productStockLabel(row),
      },
      {
        key: 'active',
        title: tp('colActive'),
        flex: '0 1 72px',
        render: (row) => (row.active ? t('events.form.yes') : t('events.form.no')),
      },
    ]
    if (onViewSales || onDelete) {
      base.push({
        key: 'actions',
        title: tp('colActions'),
        flex: onViewSales && onDelete ? '0 0 72px' : '0 0 56px',
        align: 'center',
        stopRowClick: true,
        render: (row) => (
          <span style={{ display: 'inline-flex' }}>
            {onViewSales ? (
              <Tooltip title={tp('viewSales')} placement="bottom">
                <Button
                  type="text"
                  size="small"
                  icon={<DollarOutlined />}
                  aria-label={tp('viewSales')}
                  onClick={() => onViewSales(row.id)}
                />
              </Tooltip>
            ) : null}
            {onDelete ? (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                aria-label={tp('delete')}
                onClick={() => onDelete(row.id)}
              />
            ) : null}
          </span>
        ),
      })
    }
    return base
  }, [onDelete, onViewSales, t, tp])

  return (
    <ShrinkableColumnList
      items={products}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={onEdit}
    />
  )
}

function InvitationCards({
  invitations,
  t,
  onEdit,
  onOpenGuestLink,
  onViewGuests,
}: {
  invitations: Invitation[]
  t: (key: string) => string
  onEdit: (invitationId: string) => void
  onOpenGuestLink: (invitationId: string) => void
  onViewGuests: (invitationId: string) => void
}) {
  const { xs } = Grid.useBreakpoint()
  const imageHeight = xs ? 140 : INVITATION_IMAGE_HEIGHT

  return (
    <Row gutter={[16, 16]}>
      {invitations.map((inv) => {
        const title = invitationTitle(inv)
        const expiresLabel = formatExpiresAt(inv.expires_at)
        const expiresStyle = expiresAtDisplayStyle(expiresAtVisualState(inv.expires_at))
        return (
          <Col key={inv.id} span={24}>
            <ListItemMediaCard
              title={title}
              imageAlt={title}
              imageSrc={undefined}
              imageHeight={imageHeight}
              onClick={() => onEdit(inv.id)}
              noImageText={t('events.detail.noImage')}
              headerTrailing={
                <>
                  <Tag color={statusTagColor(inv.status)}>
                    {invitationStatusLabel(t, inv.status)}
                  </Tag>
                  <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 4 }}>
                    <Tooltip title={t('events.invitations.viewGuests')} placement="bottom">
                      <Button
                        type="text"
                        icon={<TeamOutlined />}
                        aria-label={t('events.invitations.viewGuests')}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onViewGuests(inv.id)
                        }}
                      />
                    </Tooltip>
                    <Tooltip title={t('events.invitations.openGuestLink')} placement="bottom">
                      <Button
                        type="text"
                        icon={<LinkOutlined />}
                        aria-label={t('events.invitations.openGuestLink')}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onOpenGuestLink(inv.id)
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
}

function InvitationColumnList({
  invitations,
  t,
  onEdit,
  onOpenGuestLink,
  onViewGuests,
}: {
  invitations: Invitation[]
  t: (key: string) => string
  onEdit: (invitationId: string) => void
  onOpenGuestLink: (invitationId: string) => void
  onViewGuests: (invitationId: string) => void
}) {
  const [sortKey, setSortKey] = useState<InvitationSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSortChange = useCallback(
    (key: string) => {
      const nextKey = key as InvitationSortKey
      if (nextKey === sortKey) {
        setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
        return
      }
      setSortKey(nextKey)
      setSortDirection('asc')
    },
    [sortKey],
  )

  const sortedInvitations = useMemo(
    () =>
      [...invitations].sort((a, b) => compareInvitations(a, b, sortKey, sortDirection)),
    [invitations, sortDirection, sortKey],
  )

  const columns = useMemo(
    (): ListColumnDef<Invitation>[] => [
      {
        key: 'name',
        title: t('events.invitations.colName'),
        flex: '2 1 140px',
        render: (inv) => <Text ellipsis>{invitationTitle(inv)}</Text>,
      },
      {
        key: 'spots',
        title: t('events.invitations.colSpots'),
        flex: '1 1 120px',
        render: (inv) => {
          const count = inv.spot_count ?? 0
          return count > 0 ? String(count) : '—'
        },
      },
      {
        key: 'status',
        title: t('events.invitations.colStatus'),
        flex: '1 1 100px',
        render: (inv) => (
          <Tag color={statusTagColor(inv.status)}>{invitationStatusLabel(t, inv.status)}</Tag>
        ),
      },
      {
        key: 'expires',
        title: t('events.invitations.colExpiresAt'),
        flex: '1 1 140px',
        render: (inv) => (
          <Text ellipsis style={expiresAtDisplayStyle(expiresAtVisualState(inv.expires_at))}>
            {formatExpiresAt(inv.expires_at)}
          </Text>
        ),
      },
      {
        key: 'actions',
        title: t('events.invitations.colActions'),
        flex: '0 0 96px',
        align: 'center',
        stopRowClick: true,
        render: (inv) => (
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <Tooltip title={t('events.invitations.viewGuests')} placement="bottom">
              <Button
                type="text"
                size="small"
                icon={<TeamOutlined />}
                aria-label={t('events.invitations.viewGuests')}
                onClick={() => onViewGuests(inv.id)}
              />
            </Tooltip>
            <Tooltip title={t('events.invitations.openGuestLink')} placement="bottom">
              <Button
                type="text"
                size="small"
                icon={<LinkOutlined />}
                aria-label={t('events.invitations.openGuestLink')}
                onClick={() => onOpenGuestLink(inv.id)}
              />
            </Tooltip>
          </span>
        ),
      },
    ],
    [onOpenGuestLink, onViewGuests, t],
  )

  return (
    <ShrinkableColumnList
      items={sortedInvitations}
      columns={columns}
      rowKey={(inv) => inv.id}
      onRowClick={(inv) => onEdit(inv.id)}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      sortableColumnKeys={INVITATION_SORTABLE_COLUMNS}
    />
  )
}

function MerchOrTicketSection(props: MerchSectionProps | TicketSectionProps) {
  const { eventId } = props
  const variant = props.variant ?? 'merchandise'
  const { t } = useTranslation()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const ns = variant === 'ticket' ? 'events.tickets' : 'events.products'
  const tp = useCallback((key: string) => t(`${ns}.${key}`), [t, ns])
  const merchQ = useEventMerchProducts(variant === 'merchandise' ? eventId : undefined)
  const ticketQ = useEventTicketProducts(variant === 'ticket' ? eventId : undefined)
  const isLoading = variant === 'merchandise' ? merchQ.isLoading : ticketQ.isLoading
  const products = (variant === 'merchandise' ? merchQ.data : ticketQ.data) ?? []

  const onCreate = props.variant === 'ticket' ? props.onTicketCreate : props.onMerchCreate
  const onEdit = props.variant === 'ticket' ? props.onTicketEdit : props.onMerchEdit
  const onViewSales =
    props.variant === 'ticket'
      ? props.onTicketViewSales
      : props.onMerchViewSales

  const openEdit = useCallback(
    (p: Product) => {
      onEdit(p.id)
    },
    [onEdit],
  )

  return (
    <>
      <SectionShell
        title={tp('sectionTitle')}
        intro={tp('sectionIntro')}
        onAdd={onCreate}
        addLabel={t('events.form.addButton')}
        loading={isLoading}
        empty={products.length === 0}
        emptyText={tp('tableEmpty')}
      >
        {useCardLayout ? (
          <ProductCards
            products={products}
            ns={ns}
            tp={tp}
            t={t}
            onEdit={openEdit}
            onViewSales={onViewSales}
          />
        ) : (
          <ProductColumnList
            products={products}
            tp={tp}
            t={t}
            onEdit={openEdit}
            onViewSales={onViewSales}
          />
        )}
      </SectionShell>
    </>
  )
}

function InvitationSection(props: InvitationSectionProps) {
  const { eventId, onCreate, onEdit } = props
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const tp = (key: string) => t(`events.invitations.${key}`)
  const { data: invitations = [], isLoading } = useEventInvitations(eventId)
  const regenerateTokenMutation = useRegenerateInvitationAccessToken(eventId)
  const [accessTokenByInvitationId, setAccessTokenByInvitationId] = useState<Record<string, string>>(
    {},
  )
  const [linkModalInvitationId, setLinkModalInvitationId] = useState<string | null>(null)
  const [linkModalGenerating, setLinkModalGenerating] = useState(false)

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

  const regenerateAndStoreToken = useCallback(
    async (invitationId: string): Promise<string> => {
      const { access_token } = await regenerateTokenMutation.mutateAsync(invitationId)
      setStoredInvitationAccessToken(invitationId, access_token)
      setAccessTokenByInvitationId((prev) => ({ ...prev, [invitationId]: access_token }))
      return access_token
    },
    [regenerateTokenMutation],
  )

  const buildGuestInvitationUrl = useCallback(
    (invitationId: string, token: string) =>
      `${window.location.origin}${guestInvitationHref(eventId, invitationId, token)}`,
    [eventId],
  )

  const openGuestInvitationPage = useCallback(
    (invitationId: string, token: string) => {
      window.open(buildGuestInvitationUrl(invitationId, token), '_blank', 'noopener,noreferrer')
    },
    [buildGuestInvitationUrl],
  )

  const copyGuestInvitationUrl = useCallback(
    async (invitationId: string, token: string) => {
      await navigator.clipboard.writeText(buildGuestInvitationUrl(invitationId, token))
      message.success(t('events.invitations.copyLinkSuccess'))
    },
    [buildGuestInvitationUrl, t],
  )

  const openGuestInvitation = useCallback((invitationId: string) => {
    setLinkModalInvitationId(invitationId)
  }, [])

  const closeLinkModal = useCallback(() => {
    setLinkModalInvitationId(null)
    setLinkModalGenerating(false)
  }, [])

  const linkModalHasToken = linkModalInvitationId
    ? !!getAccessToken(linkModalInvitationId)
    : false

  const handleLinkModalCopy = useCallback(async () => {
    if (!linkModalInvitationId) return
    const token = getAccessToken(linkModalInvitationId)
    if (!token) return
    try {
      await copyGuestInvitationUrl(linkModalInvitationId, token)
      closeLinkModal()
    } catch {
      message.error(t('events.invitations.copyLinkFailed'))
    }
  }, [closeLinkModal, copyGuestInvitationUrl, getAccessToken, linkModalInvitationId, t])

  const handleLinkModalOpen = useCallback(() => {
    if (!linkModalInvitationId) return
    const token = getAccessToken(linkModalInvitationId)
    if (!token) return
    openGuestInvitationPage(linkModalInvitationId, token)
    closeLinkModal()
  }, [closeLinkModal, getAccessToken, linkModalInvitationId, openGuestInvitationPage])

  const handleLinkModalGenerateCopy = useCallback(async () => {
    if (!linkModalInvitationId) return
    setLinkModalGenerating(true)
    try {
      const accessToken = await regenerateAndStoreToken(linkModalInvitationId)
      await copyGuestInvitationUrl(linkModalInvitationId, accessToken)
      closeLinkModal()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('events.invitations.refreshLinkFailed'))
    } finally {
      setLinkModalGenerating(false)
    }
  }, [
    closeLinkModal,
    copyGuestInvitationUrl,
    linkModalInvitationId,
    regenerateAndStoreToken,
    t,
  ])

  const handleLinkModalGenerateOpen = useCallback(async () => {
    if (!linkModalInvitationId) return
    setLinkModalGenerating(true)
    try {
      const accessToken = await regenerateAndStoreToken(linkModalInvitationId)
      openGuestInvitationPage(linkModalInvitationId, accessToken)
      closeLinkModal()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('events.invitations.refreshLinkFailed'))
    } finally {
      setLinkModalGenerating(false)
    }
  }, [
    closeLinkModal,
    linkModalInvitationId,
    openGuestInvitationPage,
    regenerateAndStoreToken,
    t,
  ])

  const goToCreateInvitation = useCallback(() => {
    if (onCreate) {
      onCreate()
      return
    }
    navigate(eventEditInvitationNewPath(eventId))
  }, [eventId, navigate, onCreate])

  const goToInvitationGuests = useCallback(
    (invitationId: string) => {
      navigate(eventEditInvitationGuestsPath(eventId, { invitationId }))
    },
    [eventId, navigate],
  )

  const statusFilter = useMemo(() => {
    const fromUrl = searchParams.get('status')
    if (fromUrl && INVITATION_STATUSES.includes(fromUrl as InvitationStatus)) return fromUrl
    return FILTER_ALL
  }, [searchParams])

  const expiringFilter = useMemo(() => {
    const fromUrl = searchParams.get('expiring')
    if (fromUrl === FILTER_EXPIRING_7) return FILTER_EXPIRING_7
    if (fromUrl === FILTER_EXPIRED) return FILTER_EXPIRED
    return FILTER_ALL
  }, [searchParams])

  const statusFilterOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: tp('catalogFilterAll') },
      ...INVITATION_STATUSES.map((status) => ({
        value: status,
        label: invitationStatusLabel(t, status),
      })),
    ],
    [t],
  )

  const expiringFilterOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: tp('catalogFilterAll') },
      { value: FILTER_EXPIRED, label: tp('catalogFilterExpired') },
      { value: FILTER_EXPIRING_7, label: tp('catalogFilterExpiring7Days') },
    ],
    [tp],
  )

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (statusFilter !== FILTER_ALL && inv.status !== statusFilter) return false
      if (expiringFilter === FILTER_EXPIRED && !isInvitationExpired(inv.expires_at)) return false
      if (
        expiringFilter === FILTER_EXPIRING_7 &&
        !isInvitationExpiringWithin7Days(inv.expires_at)
      ) {
        return false
      }
      return true
    })
  }, [expiringFilter, invitations, statusFilter])

  const updateSearchParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === FILTER_ALL) next.delete(key)
        else next.set(key, value)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const catalogFilterFields = useMemo(
    () => [
      {
        key: 'status',
        label: tp('catalogFilterStatus'),
        value: statusFilter,
        options: statusFilterOptions,
        onChange: (value: string) => updateSearchParams({ status: value }),
      },
      {
        key: 'expiring',
        label: tp('catalogFilterExpiring'),
        value: expiringFilter,
        options: expiringFilterOptions,
        onChange: (value: string) => updateSearchParams({ expiring: value }),
      },
    ],
    [
      expiringFilter,
      expiringFilterOptions,
      statusFilter,
      statusFilterOptions,
      tp,
      updateSearchParams,
    ],
  )

  const catalogFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (statusFilter !== FILTER_ALL) {
      chips.push({
        key: 'status',
        label: `${tp('catalogFilterStatus')}: ${invitationStatusLabel(t, statusFilter as InvitationStatus)}`,
        onRemove: () => updateSearchParams({ status: null }),
      })
    }
    if (expiringFilter === FILTER_EXPIRED) {
      chips.push({
        key: 'expiring',
        label: `${tp('catalogFilterExpiring')}: ${tp('catalogFilterExpired')}`,
        onRemove: () => updateSearchParams({ expiring: null }),
      })
    } else if (expiringFilter === FILTER_EXPIRING_7) {
      chips.push({
        key: 'expiring',
        label: `${tp('catalogFilterExpiring')}: ${tp('catalogFilterExpiring7Days')}`,
        onRemove: () => updateSearchParams({ expiring: null }),
      })
    }
    return chips
  }, [expiringFilter, statusFilter, t, tp, updateSearchParams])

  if (!eventId) {
    return (
      <Typography.Text type="secondary" style={{ display: 'block' }}>
        {t('events.form.invitationsAfterCreateHint')}
      </Typography.Text>
    )
  }

  return (
    <>
      <SectionShell
        title={t('events.invitations.sectionTitle')}
        intro={t('events.invitations.sectionIntro')}
        onAdd={goToCreateInvitation}
        addLabel={t('events.form.addButton')}
        loading={isLoading}
        empty={invitations.length === 0}
        emptyText={t('events.invitations.tableEmpty')}
        filterEmpty={invitations.length > 0 && filteredInvitations.length === 0}
        filterEmptyText={tp('catalogFilterEmpty')}
        toolbar={
          <div style={{ marginBottom: 16 }}>
            <ListFilterToolbar
              buttonLabel={tp('catalogFilterButton')}
              clearAllLabel={tp('catalogFilterClearAll')}
              fields={catalogFilterFields}
              chips={catalogFilterChips}
              onClearAll={() => updateSearchParams({ status: null, expiring: null })}
            />
          </div>
        }
      >
        {useCardLayout ? (
          <InvitationCards
            invitations={filteredInvitations}
            t={t}
            onEdit={goToEditInvitation}
            onOpenGuestLink={openGuestInvitation}
            onViewGuests={goToInvitationGuests}
          />
        ) : (
          <InvitationColumnList
            invitations={filteredInvitations}
            t={t}
            onEdit={goToEditInvitation}
            onOpenGuestLink={openGuestInvitation}
            onViewGuests={goToInvitationGuests}
          />
        )}
      </SectionShell>
      <Modal
        open={linkModalInvitationId !== null}
        title={
          linkModalHasToken
            ? t('events.invitations.linkModalTitle')
            : t('events.invitations.regenerateLinkModalTitle')
        }
        onCancel={closeLinkModal}
        footer={
          <Flex justify="flex-end" gap={8} wrap="wrap">
            <Button onClick={closeLinkModal} disabled={linkModalGenerating}>
              {t('events.invitations.regenerateLinkModalCancel')}
            </Button>
            {linkModalHasToken ? (
              <>
                <Button onClick={() => void handleLinkModalCopy()}>
                  {t('events.invitations.linkModalCopy')}
                </Button>
                <Button type="primary" onClick={handleLinkModalOpen}>
                  {t('events.invitations.linkModalOpen')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  loading={linkModalGenerating}
                  onClick={() => void handleLinkModalGenerateCopy()}
                >
                  {t('events.invitations.linkModalGenerateCopy')}
                </Button>
                <Button
                  type="primary"
                  loading={linkModalGenerating}
                  onClick={() => void handleLinkModalGenerateOpen()}
                >
                  {t('events.invitations.linkModalGenerateOpen')}
                </Button>
              </>
            )}
          </Flex>
        }
      >
        {!linkModalHasToken ? (
          <Flex vertical gap={12}>
            <Text>{t('events.invitations.regenerateLinkModalBody')}</Text>
            <Alert
              type="warning"
              showIcon
              message={t('events.invitations.regenerateLinkModalWarning')}
            />
          </Flex>
        ) : (
          <Text type="secondary">{t('events.invitations.linkModalBody')}</Text>
        )}
      </Modal>
    </>
  )
}

export function EventManageListSection(props: EventManageListSectionProps) {
  if (props.variant === 'invitation') {
    return <InvitationSection {...props} />
  }
  return <MerchOrTicketSection {...props} />
}

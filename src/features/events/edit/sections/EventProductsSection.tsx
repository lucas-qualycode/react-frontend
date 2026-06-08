import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Col,
  Empty,
  Flex,
  Grid,
  Modal,
  Row,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import { ListItemMediaCard } from '@/shared/components/ListItemMediaCard'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { Product } from '@/shared/types/api'
import { useDeleteProduct, useEventMerchProducts, useEventTicketProducts } from '@/features/events/hooks'
import { handleProductDeleteFailure } from '@/features/events/handleProductDeleteFailure'

const brl = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

const { Text } = Typography

function formatPriceMinorUnits(minor: number): string {
  return brl.format(minor / 100)
}

function productPriceLabel(row: Product, tp: (key: string) => string): string {
  return row.is_free ? tp('free') : formatPriceMinorUnits(row.value)
}

function productStockLabel(row: Product): string {
  const a = row.inventory?.available_quantity
  return a !== undefined ? `${a} / ${row.quantity}` : String(row.quantity)
}

type MerchSectionProps = {
  eventId: string
  variant?: 'merchandise'
  onMerchCreate: () => void
  onMerchEdit: (productId: string) => void
}

type TicketSectionProps = {
  eventId: string
  variant: 'ticket'
  onTicketCreate: () => void
  onTicketEdit: (productId: string) => void
}

export type EventProductsSectionProps = MerchSectionProps | TicketSectionProps

export function EventProductsSection(props: EventProductsSectionProps) {
  const { eventId } = props
  const variant = props.variant ?? 'merchandise'
  const { t } = useTranslation()
  const ns = variant === 'ticket' ? 'events.tickets' : 'events.products'
  const tp = useCallback((key: string) => t(`${ns}.${key}`), [t, ns])
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const { xs } = screens
  const merchQ = useEventMerchProducts(variant === 'merchandise' ? eventId : undefined)
  const ticketQ = useEventTicketProducts(variant === 'ticket' ? eventId : undefined)
  const isLoading = variant === 'merchandise' ? merchQ.isLoading : ticketQ.isLoading
  const products = (variant === 'merchandise' ? merchQ.data : ticketQ.data) ?? []
  const deleteMutation = useDeleteProduct()
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<string | null>(null)

  const onCreate =
    props.variant === 'ticket' ? props.onTicketCreate : props.onMerchCreate
  const onEdit =
    props.variant === 'ticket' ? props.onTicketEdit : props.onMerchEdit

  const openCreate = useCallback(() => {
    onCreate()
  }, [onCreate])

  const openEdit = useCallback(
    (p: Product) => {
      onEdit(p.id)
    },
    [onEdit],
  )

  const columns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: tp('colName'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
      },
      {
        title: tp('colPrice'),
        key: 'price',
        width: 120,
        render: (_, row) => productPriceLabel(row, tp),
      },
      {
        title: tp('colStock'),
        key: 'stock',
        width: 140,
        render: (_, row) => productStockLabel(row),
      },
      {
        title: tp('colActive'),
        dataIndex: 'active',
        key: 'active',
        width: 90,
        render: (active: boolean) => (active ? t('events.form.yes') : t('events.form.no')),
      },
      {
        title: '',
        key: 'actions',
        width: 56,
        align: 'center',
        render: (_, row) => (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            aria-label={tp('delete')}
            onClick={(e) => {
              e.stopPropagation()
              setPendingDeleteProductId(row.id)
            }}
          />
        ),
      },
    ],
    [t, tp],
  )

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
          {tp('sectionTitle')}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('events.form.addButton')}
        </Button>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {tp('sectionIntro')}
      </Typography.Paragraph>
      {isLoading ? (
        <Spin />
      ) : useCardLayout ? (
        products.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tp('tableEmpty')} />
        ) : (
          <Row gutter={[16, 16]}>
            {products.map((row) => {
              const imageHeight = xs ? 180 : 200
              return (
                <Col key={row.id} span={24}>
                  <ListItemMediaCard
                    title={row.name}
                    imageAlt={row.name}
                    imageSrc={row.imageURL}
                    imageHeight={imageHeight}
                    onClick={() => openEdit(row)}
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
                                openEdit(row)
                              }}
                            />
                          </Tooltip>
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
                                  setPendingDeleteProductId(row.id)
                                }}
                              />
                            </span>
                          </Tooltip>
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
              )
            })}
          </Row>
        )
      ) : (
        <Table<Product>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={products}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: tp('tableEmpty') }}
          onRow={(record) => ({
            onClick: () => openEdit(record),
            style: { cursor: 'pointer' },
          })}
        />
      )}
      <Modal
        title={tp('deleteConfirmTitle')}
        open={pendingDeleteProductId !== null}
        okText={tp('deleteOk')}
        cancelText={t('events.tags.cancel')}
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
        onCancel={() => setPendingDeleteProductId(null)}
        onOk={async () => {
          if (!pendingDeleteProductId) return
          try {
            await deleteMutation.mutateAsync({
              productId: pendingDeleteProductId,
              eventId,
            })
            message.success(tp('deleteSuccess'))
            setPendingDeleteProductId(null)
          } catch (e) {
            setPendingDeleteProductId(null)
            handleProductDeleteFailure(e, t)
          }
        }}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>{tp('deleteConfirmBody')}</Typography.Paragraph>
      </Modal>
    </div>
  )
}

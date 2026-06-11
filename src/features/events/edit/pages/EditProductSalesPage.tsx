import { Empty, Flex, Grid, Spin, Typography } from 'antd'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { Invitation, UserProduct } from '@/shared/types/api'
import {
  useEventGiftUserProducts,
  useEventInvitations,
  useEventMerchProducts,
} from '@/features/events/hooks'
import { ListFilterToolbar } from '../components/ListFilterToolbar'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

const { Text, Title } = Typography
const brl = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })
const ALL_PRODUCTS = '__all__'

type SalesRow = UserProduct & {
  productName: string
  invitationLabel: string | null
}

type ListColumnDef<T> = {
  key: string
  title: string
  flex: string
  render: (item: T) => ReactNode
}

function formatPriceMinorUnits(minor: number, currency: string, freeLabel: string): string {
  if (minor === 0) return freeLabel
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100)
  } catch {
    return brl.format(minor / 100)
  }
}

function formatPurchaseDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function SalesColumnList({ rows, tp }: { rows: SalesRow[]; tp: (key: string) => string }) {
  const columns = useMemo(
    (): ListColumnDef<SalesRow>[] => [
      {
        key: 'product',
        title: tp('salesColProduct'),
        flex: '2 1 140px',
        render: (row) => <Text ellipsis>{row.productName}</Text>,
      },
      {
        key: 'quantity',
        title: tp('salesColQuantity'),
        flex: '0 1 72px',
        render: (row) => row.quantity,
      },
      {
        key: 'price',
        title: tp('salesColPrice'),
        flex: '1 1 96px',
        render: (row) => formatPriceMinorUnits(row.price, row.currency, tp('free')),
      },
      {
        key: 'buyer',
        title: tp('salesColBuyer'),
        flex: '1 1 120px',
        render: (row) => row.invitationLabel ?? '—',
      },
      {
        key: 'date',
        title: tp('salesColDate'),
        flex: '1 1 140px',
        render: (row) => formatPurchaseDate(row.purchase_date),
      },
    ],
    [tp],
  )

  return (
    <Flex vertical gap={0} style={{ width: '100%' }}>
      <Flex
        align="center"
        gap={8}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {columns.map((col) => (
          <div key={col.key} style={{ flex: col.flex, minWidth: 0 }}>
            {col.title}
          </div>
        ))}
      </Flex>
      {rows.map((row) => (
        <Flex
          key={row.id}
          align="center"
          gap={8}
          style={{
            width: '100%',
            padding: '12px',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          {columns.map((col) => (
            <div key={col.key} style={{ flex: col.flex, minWidth: 0 }}>
              {col.render(row)}
            </div>
          ))}
        </Flex>
      ))}
    </Flex>
  )
}

function SalesCards({ rows, tp }: { rows: SalesRow[]; tp: (key: string) => string }) {
  return (
    <Flex vertical gap={12}>
      {rows.map((row) => (
        <Flex
          key={row.id}
          vertical
          gap={4}
          style={{
            padding: 16,
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Text strong>{row.productName}</Text>
          <Text type="secondary">
            {tp('salesColQuantity')}: {row.quantity}
          </Text>
          <Text type="secondary">
            {tp('salesColPrice')}: {formatPriceMinorUnits(row.price, row.currency, tp('free'))}
          </Text>
          {row.invitationLabel ? (
            <Text type="secondary">
              {tp('salesColBuyer')}: {row.invitationLabel}
            </Text>
          ) : null}
          <Text type="secondary">
            {tp('salesColDate')}: {formatPurchaseDate(row.purchase_date)}
          </Text>
        </Flex>
      ))}
    </Flex>
  )
}

export function EditProductSalesPage() {
  const { t } = useTranslation()
  const { eventId } = useEventEditContext()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const tp = (key: string) => t(`events.products.${key}`)
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: products = [], isLoading: productsLoading } = useEventMerchProducts(eventId)
  const { data: invitations = [] } = useEventInvitations(eventId)

  const productFilter = useMemo(() => {
    const fromUrl = searchParams.get('product')
    if (!fromUrl) return ALL_PRODUCTS
    if (products.length === 0) return fromUrl
    return products.some((p) => p.id === fromUrl) ? fromUrl : ALL_PRODUCTS
  }, [products, searchParams])

  const selectedProductId = productFilter === ALL_PRODUCTS ? null : productFilter
  const { data: sales = [], isLoading: salesLoading } = useEventGiftUserProducts(
    eventId,
    selectedProductId,
  )

  const invitationById = useMemo(() => {
    const map = new Map<string, Invitation>()
    for (const inv of invitations) map.set(inv.id, inv)
    return map
  }, [invitations])

  const productNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products) map.set(p.id, p.name)
    return map
  }, [products])

  const rows = useMemo((): SalesRow[] => {
    return sales.map((item) => ({
      ...item,
      productName: productNameById.get(item.product_id) ?? item.product_id,
      invitationLabel: item.invitation_id
        ? (invitationById.get(item.invitation_id)?.name ?? null)
        : null,
    }))
  }, [sales, productNameById, invitationById])

  const filterOptions = useMemo(
    () => [
      { value: ALL_PRODUCTS, label: tp('salesFilterAll') },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products, tp],
  )

  const salesFilterFields = useMemo(
    () => [
      {
        key: 'product',
        label: tp('salesFilterLabel'),
        value: productFilter,
        options: filterOptions,
        onChange: (value: string) => {
          if (value === ALL_PRODUCTS) setSearchParams({}, { replace: true })
          else setSearchParams({ product: value }, { replace: true })
        },
        loading: productsLoading,
      },
    ],
    [filterOptions, productFilter, productsLoading, setSearchParams, tp],
  )

  const salesFilterChips = useMemo(() => {
    if (productFilter === ALL_PRODUCTS) return []
    const label =
      filterOptions.find((option) => option.value === productFilter)?.label ?? productFilter
    return [
      {
        key: 'product',
        label: `${tp('salesFilterLabel')}: ${label}`,
        onRemove: () => setSearchParams({}, { replace: true }),
      },
    ]
  }, [filterOptions, productFilter, setSearchParams, tp])

  const loading = productsLoading || salesLoading

  return (
    <EditTabShell showSave={false}>
      <Flex vertical gap={16}>
        <div>
          <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {tp('salesSectionTitle')}
          </Title>
          <Text type="secondary">{tp('salesSectionIntro')}</Text>
        </div>
        <ListFilterToolbar
          buttonLabel={tp('salesFilterButton')}
          clearAllLabel={tp('salesFilterClearAll')}
          fields={salesFilterFields}
          chips={salesFilterChips}
          onClearAll={() => setSearchParams({}, { replace: true })}
        />
        {loading ? (
          <Spin />
        ) : rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tp('salesEmpty')} />
        ) : useCardLayout ? (
          <SalesCards rows={rows} tp={tp} />
        ) : (
          <SalesColumnList rows={rows} tp={tp} />
        )}
      </Flex>
    </EditTabShell>
  )
}

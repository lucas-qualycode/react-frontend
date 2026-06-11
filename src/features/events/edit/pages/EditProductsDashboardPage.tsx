import { AppstoreOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Flex, Row, Spin, Statistic, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  useEventGiftUserProducts,
  useEventMerchProducts,
} from '@/features/events/hooks'
import {
  eventEditMerchCatalogPath,
  eventEditMerchNewPath,
  eventEditMerchSalesPath,
} from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

const { Text, Title } = Typography
const brl = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

function formatPriceMinorUnits(minor: number): string {
  return brl.format(minor / 100)
}

export function EditProductsDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useEventEditContext()
  const tp = (key: string) => t(`events.products.${key}`)

  const { data: products = [], isLoading: productsLoading } = useEventMerchProducts(eventId)
  const { data: sales = [], isLoading: salesLoading } = useEventGiftUserProducts(eventId, null)

  const stats = useMemo(() => {
    const activeCount = products.filter((p) => p.active).length
    const soldUnits = sales.reduce((sum, item) => sum + item.quantity, 0)
    const revenueMinor = sales.reduce((sum, item) => sum + item.price, 0)
    return {
      productCount: products.length,
      activeCount,
      soldUnits,
      revenueMinor,
    }
  }, [products, sales])

  const productRows = useMemo(() => {
    const soldByProduct = new Map<string, { units: number; revenue: number }>()
    for (const sale of sales) {
      const current = soldByProduct.get(sale.product_id) ?? { units: 0, revenue: 0 }
      soldByProduct.set(sale.product_id, {
        units: current.units + sale.quantity,
        revenue: current.revenue + sale.price,
      })
    }
    return products.map((product) => {
      const sold = soldByProduct.get(product.id)
      return {
        id: product.id,
        name: product.name,
        active: product.active,
        available: product.inventory?.available_quantity,
        total: product.quantity,
        soldUnits: sold?.units ?? 0,
        revenueMinor: sold?.revenue ?? 0,
      }
    })
  }, [products, sales])

  const loading = productsLoading || salesLoading

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
            onClick={() => navigate(eventEditMerchNewPath(eventId))}
          >
            {t('events.form.addButton')}
          </Button>
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => navigate(eventEditMerchCatalogPath(eventId))}
          >
            {tp('subNavCatalog')}
          </Button>
          <Button
            icon={<DollarOutlined />}
            onClick={() => navigate(eventEditMerchSalesPath(eventId))}
          >
            {tp('subNavSales')}
          </Button>
        </Flex>

        {loading ? (
          <Spin />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic title={tp('dashboardStatProducts')} value={stats.productCount} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic title={tp('dashboardStatActive')} value={stats.activeCount} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic title={tp('dashboardStatSoldUnits')} value={stats.soldUnits} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title={tp('dashboardStatRevenue')}
                    value={formatPriceMinorUnits(stats.revenueMinor)}
                  />
                </Card>
              </Col>
            </Row>

            <div>
              <Title level={5} style={{ marginTop: 0 }}>
                {tp('dashboardByProductTitle')}
              </Title>
              {productRows.length === 0 ? (
                <Text type="secondary">{tp('tableEmpty')}</Text>
              ) : (
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
                    <div style={{ flex: '1 1 100px', minWidth: 0 }}>{tp('colStock')}</div>
                    <div style={{ flex: '0 1 72px', minWidth: 0 }}>{tp('dashboardColSold')}</div>
                    <div style={{ flex: '1 1 96px', minWidth: 0 }}>{tp('dashboardColRevenue')}</div>
                  </Flex>
                  {productRows.map((row) => (
                    <Flex
                      key={row.id}
                      align="center"
                      gap={12}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ flex: '2 1 140px', minWidth: 0 }}>
                        <Text ellipsis>{row.name}</Text>
                      </div>
                      <div style={{ flex: '1 1 100px', minWidth: 0 }}>
                        <Text type="secondary">
                          {row.available !== undefined ? `${row.available} / ${row.total}` : row.total}
                        </Text>
                      </div>
                      <div style={{ flex: '0 1 72px', minWidth: 0 }}>{row.soldUnits}</div>
                      <div style={{ flex: '1 1 96px', minWidth: 0 }}>
                        {formatPriceMinorUnits(row.revenueMinor)}
                      </div>
                    </Flex>
                  ))}
                </Flex>
              )}
            </div>
          </>
        )}
      </Flex>
    </EditTabShell>
  )
}

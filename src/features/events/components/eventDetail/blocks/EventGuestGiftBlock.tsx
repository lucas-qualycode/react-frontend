import {
  CheckOutlined,
  GiftOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button, Empty, Flex, Modal, Spin, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, Product } from '@/shared/types/api'
import { useEventMerchProducts } from '@/features/events/hooks'
import { buildCheckoutSnapshotFromProducts, type GuestCheckoutSnapshot } from '../guestCheckoutSession'
import { GIFT_PRODUCTS_PER_PAGE, USE_MOCK_GIFT_PRODUCTS, getMockGiftProducts } from '../guestGiftMock'
import { GuestFlowActions } from '../GuestFlowActions'
import { GuestFlowBlockHeader } from '../GuestFlowBlockHeader'
import { GuestFlowContentPanel } from '../GuestFlowContentPanel'
import type { GuestGiftPhase } from '../guestFlowDraft'
import type { EventGuestGiftVariant } from '../types'
import '../eventGuestGift.css'

const { Text } = Typography

type Props = {
  event: Event
  variant: EventGuestGiftVariant
  selectedProductIds: string[]
  onSelectedProductIdsChange: (ids: string[]) => void
  phase: GuestGiftPhase
  onPhaseChange: (phase: GuestGiftPhase) => void
  page: number
  onPageChange: (page: number) => void
  onBack: () => void
  onGiftsConfirmed: (snapshot: GuestCheckoutSnapshot) => void
}

const priceFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

function formatProductPrice(product: Product, freeLabel: string) {
  if (product.is_free) return freeLabel
  return priceFormatter.format(product.value / 100)
}

type GuestGiftProductCardProps = {
  product: Product
  freeLabel: string
  selected: boolean
  onToggle?: () => void
  onPreviewImage?: () => void
  previewImageLabel?: string
}

function GuestGiftProductCard({
  product,
  freeLabel,
  selected,
  onToggle,
  onPreviewImage,
  previewImageLabel,
}: GuestGiftProductCardProps) {
  const interactive = Boolean(onToggle)
  const imageSrc = product.imageURL?.trim()
  const className = `guest-gift-card${selected ? ' is-selected' : ''}${
    interactive ? '' : ' guest-gift-card--review'
  }`

  const media = imageSrc ? (
    onPreviewImage ? (
      <button
        type="button"
        className="guest-gift-card-media guest-gift-card-media-preview"
        onClick={(e) => {
          e.stopPropagation()
          onPreviewImage()
        }}
        aria-label={previewImageLabel}
      >
        <img src={imageSrc} alt="" className="guest-gift-card-image" />
      </button>
    ) : (
      <div className="guest-gift-card-media">
        <img src={imageSrc} alt="" className="guest-gift-card-image" />
      </div>
    )
  ) : (
    <div className="guest-gift-card-media">
      <div className="guest-gift-card-image-placeholder" aria-hidden>
        <GiftOutlined />
      </div>
    </div>
  )

  const body = (
    <>
      {media}
      <div className="guest-gift-card-content">
        <div className="guest-gift-card-details">
          <span className="guest-gift-card-title">{product.name}</span>
          <span className="guest-gift-card-price">{formatProductPrice(product, freeLabel)}</span>
        </div>
        {interactive ? (
          <span className="guest-gift-card-action" aria-hidden>
            {selected ? <CheckOutlined /> : <PlusOutlined />}
          </span>
        ) : null}
      </div>
    </>
  )

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        onClick={onToggle}
        aria-pressed={selected}
      >
        {body}
      </button>
    )
  }

  return <div className={className}>{body}</div>
}

type GuestGiftSummaryBarProps = {
  selectedCount: number
  totalCents: number
}

function GuestGiftSummaryBar({ selectedCount, totalCents }: GuestGiftSummaryBarProps) {
  const { t } = useTranslation()

  return (
    <div className="guest-gift-summary">
      <Text className="guest-gift-summary-count">
        {t('events.detail.guestGift.selectedCount', { count: selectedCount })}
      </Text>
      <Text strong className="guest-gift-summary-total">
        {t('events.detail.guestGift.total')}: {priceFormatter.format(totalCents / 100)}
      </Text>
    </div>
  )
}

function useGiftProducts(eventId: string) {
  const { data: apiProducts = [], isLoading } = useEventMerchProducts(
    USE_MOCK_GIFT_PRODUCTS ? undefined : eventId,
  )
  const products = useMemo(() => {
    if (USE_MOCK_GIFT_PRODUCTS) return getMockGiftProducts()
    const active = apiProducts.filter((p) => p.active !== false)
    if (active.length > 0) return active
    return getMockGiftProducts()
  }, [apiProducts])
  return {
    products,
    isLoading: USE_MOCK_GIFT_PRODUCTS ? false : isLoading && apiProducts.length === 0,
  }
}

type BrowseProps = {
  products: Product[]
  page: number
  selectedIds: Set<string>
  totalCents: number
  onToggle: (productId: string) => void
  onPageChange: (page: number) => void
  onBack: () => void
  onContinue: () => void
}

function GiftBrowseView({
  products,
  page,
  selectedIds,
  totalCents,
  onToggle,
  onPageChange,
  onBack,
  onContinue,
}: BrowseProps) {
  const { t } = useTranslation()
  const pageCount = Math.max(1, Math.ceil(products.length / GIFT_PRODUCTS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageProducts = products.slice(
    safePage * GIFT_PRODUCTS_PER_PAGE,
    safePage * GIFT_PRODUCTS_PER_PAGE + GIFT_PRODUCTS_PER_PAGE,
  )
  const placeholderCount = Math.max(0, GIFT_PRODUCTS_PER_PAGE - pageProducts.length)
  const freeLabel = t('events.detail.guestGift.free')
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)

  return (
    <>
      <GuestFlowBlockHeader
        icon={<GiftOutlined />}
        title={t('events.detail.guestGift.title')}
        subtitle={t('events.detail.guestGift.subtitle')}
      />

      {products.length === 0 ? (
        <Empty description={t('events.detail.guestGift.emptyProducts')} />
      ) : (
        <>
          <div className="guest-gift-list">
            {pageProducts.map((product) => (
              <GuestGiftProductCard
                key={product.id}
                product={product}
                freeLabel={freeLabel}
                selected={selectedIds.has(product.id)}
                onToggle={() => onToggle(product.id)}
                onPreviewImage={() => setPreviewProduct(product)}
                previewImageLabel={t('events.detail.guestGift.viewImage', { name: product.name })}
              />
            ))}
            {Array.from({ length: placeholderCount }, (_, index) => (
              <div
                key={`gift-placeholder-${safePage}-${index}`}
                className="guest-gift-card guest-gift-card-placeholder"
                aria-hidden
              >
                <div className="guest-gift-card-media">
                  <div className="guest-gift-card-image-placeholder" aria-hidden>
                    <GiftOutlined />
                  </div>
                </div>
                <div className="guest-gift-card-content guest-gift-card-content-placeholder">
                  <div className="guest-gift-card-details">
                    <span className="guest-gift-card-title-placeholder" />
                    <span className="guest-gift-card-price-placeholder" />
                  </div>
                  <span className="guest-gift-card-action-placeholder" aria-hidden />
                </div>
              </div>
            ))}
          </div>

          <Flex align="center" justify="space-between" gap={12} style={{ width: '100%' }}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              disabled={safePage === 0}
              onClick={() => onPageChange(safePage - 1)}
              aria-label={t('events.detail.guestGift.prevPage')}
            />
            <Text type="secondary">
              {t('events.detail.guestGift.pageOf', { current: safePage + 1, total: pageCount })}
            </Text>
            <Button
              type="text"
              icon={<RightOutlined />}
              disabled={safePage >= pageCount - 1}
              onClick={() => onPageChange(safePage + 1)}
              aria-label={t('events.detail.guestGift.nextPage')}
            />
          </Flex>

          <GuestGiftSummaryBar selectedCount={selectedIds.size} totalCents={totalCents} />

          <Modal
            open={previewProduct !== null}
            title={previewProduct?.name}
            footer={null}
            centered
            destroyOnClose
            onCancel={() => setPreviewProduct(null)}
          >
            {previewProduct?.imageURL?.trim() ? (
              <img
                src={previewProduct.imageURL.trim()}
                alt={previewProduct.name}
                className="guest-gift-preview-image"
              />
            ) : null}
          </Modal>
        </>
      )}

      <GuestFlowActions>
        <Button size="large" onClick={onBack}>
          {t('events.detail.guestGift.back')}
        </Button>
        <Button type="primary" size="large" onClick={onContinue} disabled={products.length === 0}>
          {t('events.detail.guestGift.continue')}
        </Button>
      </GuestFlowActions>
    </>
  )
}

type ReviewProps = {
  selectedProducts: Product[]
  onBackToBrowse: () => void
  onConfirm: () => void
}

function GiftReviewView({ selectedProducts, onBackToBrowse, onConfirm }: ReviewProps) {
  const { t } = useTranslation()
  const freeLabel = t('events.detail.guestGift.free')
  const hasSelection = selectedProducts.length > 0
  const totalCents = selectedProducts.reduce(
    (sum, p) => sum + (p.is_free ? 0 : p.value),
    0,
  )

  return (
    <>
      <GuestFlowBlockHeader
        icon={<GiftOutlined />}
        title={t('events.detail.guestGift.reviewTitle')}
        subtitle={
          hasSelection
            ? t('events.detail.guestGift.reviewSubtitleSelected')
            : t('events.detail.guestGift.reviewSubtitleEmpty')
        }
      />

      {hasSelection ? (
        <>
          <div className="guest-gift-list">
            {selectedProducts.map((product) => (
              <GuestGiftProductCard
                key={product.id}
                product={product}
                freeLabel={freeLabel}
                selected
              />
            ))}
          </div>
          <GuestGiftSummaryBar
            selectedCount={selectedProducts.length}
            totalCents={totalCents}
          />
        </>
      ) : (
        <Flex
          vertical
          align="center"
          gap={12}
          style={{
            width: '100%',
            padding: '24px 16px',
            borderRadius: 12,
            background: 'var(--ant-color-fill-quaternary)',
            textAlign: 'center',
          }}
        >
          <GiftOutlined style={{ fontSize: 32, color: 'var(--ant-color-text-quaternary)' }} />
          <Text style={{ fontSize: 16, lineHeight: 1.7 }}>{t('events.detail.guestGift.reviewEmptyBody')}</Text>
        </Flex>
      )}

      <GuestFlowActions>
        <Button size="large" onClick={onBackToBrowse}>
          {hasSelection
            ? t('events.detail.guestGift.reviewBackEdit')
            : t('events.detail.guestGift.reviewBackSelect')}
        </Button>
        <Button type="primary" size="large" onClick={onConfirm}>
          {t('events.detail.guestGift.reviewConfirm')}
        </Button>
      </GuestFlowActions>
    </>
  )
}

export function EventGuestGiftBlock({
  event,
  variant,
  selectedProductIds,
  onSelectedProductIdsChange,
  phase,
  onPhaseChange,
  page,
  onPageChange,
  onBack,
  onGiftsConfirmed,
}: Props) {
  const { products, isLoading } = useGiftProducts(event.id)

  if (variant !== 'wedding') return null

  const selectedIds = useMemo(() => new Set(selectedProductIds), [selectedProductIds])

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  )

  const totalCents = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + (p.is_free ? 0 : p.value), 0),
    [selectedProducts],
  )

  const toggleProduct = (productId: string) => {
    const next = new Set(selectedIds)
    if (next.has(productId)) next.delete(productId)
    else next.add(productId)
    onSelectedProductIdsChange([...next])
  }

  return (
    <GuestFlowContentPanel panelSize={phase === 'review' ? 'fit' : 'stable'}>
      {isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 200, width: '100%' }}>
          <Spin size="large" />
        </Flex>
      ) : phase === 'browse' ? (
        <GiftBrowseView
          products={products}
          page={page}
          selectedIds={selectedIds}
          totalCents={totalCents}
          onToggle={toggleProduct}
          onPageChange={onPageChange}
          onBack={onBack}
          onContinue={() => onPhaseChange('review')}
        />
      ) : (
        <GiftReviewView
          selectedProducts={selectedProducts}
          onBackToBrowse={() => onPhaseChange('browse')}
          onConfirm={() => {
            onGiftsConfirmed(buildCheckoutSnapshotFromProducts(event.id, selectedProducts))
          }}
        />
      )}
    </GuestFlowContentPanel>
  )
}

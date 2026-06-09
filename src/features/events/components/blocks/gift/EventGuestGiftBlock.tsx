import { GiftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Empty, Flex, Modal, Spin, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, Product } from '@/shared/types/api'
import { buildCheckoutSnapshotFromProducts, type GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import type { GuestConfirmFormSlot } from '../../invitationFlow/lib/guestConfirmMock'
import { GuestGiftProductCard } from './GuestGiftProductCard'
import { GuestGiftSummaryBar } from './GuestGiftSummaryBar'
const GIFT_PRODUCTS_PER_PAGE = 4
import { useGuestGiftProducts } from './useGuestGiftProducts'
import { GuestFlowActions } from '../../invitationFlow/shared/GuestFlowActions'
import { GuestFlowBlockHeader } from '../../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestFlowContentPanel } from '../../invitationFlow/shared/GuestFlowContentPanel'
import type { GuestGiftPhase } from '../../invitationFlow/lib/guestFlowDraft'
import type { EventGuestGiftVariant } from '../../invitationFlow/types'
import './eventGuestGift.css'

const { Text } = Typography

type Props = {
  event: Event
  invitationId: string
  variant: EventGuestGiftVariant
  spots: GuestConfirmFormSlot[]
  selectedProductIds: string[]
  onSelectedProductIdsChange: (ids: string[]) => void
  phase: GuestGiftPhase
  onPhaseChange: (phase: GuestGiftPhase) => void
  page: number
  onPageChange: (page: number) => void
  onBack?: () => void
  editFromFinished?: boolean
  onCancelEdit?: () => void
  onGiftsConfirmed: (snapshot: GuestCheckoutSnapshot) => void
}

type BrowseProps = {
  products: Product[]
  page: number
  selectedIds: Set<string>
  totalCents: number
  onToggle: (productId: string) => void
  onPageChange: (page: number) => void
  onBack?: () => void
  backLabel?: string
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
  backLabel,
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
        {onBack ? (
          <Button size="large" onClick={onBack}>
            {backLabel ?? t('events.detail.guestGift.back')}
          </Button>
        ) : null}
        <Button type="primary" size="large" onClick={onContinue} disabled={products.length === 0}>
          {t('events.detail.guestGift.continue')}
        </Button>
      </GuestFlowActions>
    </>
  )
}

type ReviewProps = {
  selectedProducts: Product[]
  hasAttendingGuests: boolean
  onBackToBrowse: () => void
  onConfirm: () => void
}

function GiftReviewView({ selectedProducts, hasAttendingGuests, onBackToBrowse, onConfirm }: ReviewProps) {
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
          <Text style={{ fontSize: 16, lineHeight: 1.7 }}>
            {hasAttendingGuests
              ? t('events.detail.guestGift.reviewEmptyBody')
              : t('events.detail.guestGift.reviewEmptyBodyNoGuests')}
          </Text>
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
  invitationId,
  variant,
  spots,
  selectedProductIds,
  onSelectedProductIdsChange,
  phase,
  onPhaseChange,
  page,
  onPageChange,
  onBack,
  editFromFinished = false,
  onCancelEdit,
  onGiftsConfirmed,
}: Props) {
  const { t } = useTranslation()
  const { products, isLoading } = useGuestGiftProducts(invitationId)

  if (variant !== 'wedding') return null

  const selectedIds = useMemo(() => new Set(selectedProductIds), [selectedProductIds])
  const hasAttendingGuests = spots.some((slot) => slot.attending !== false)

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id) && p.type === 'GIFT'),
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
          onBack={editFromFinished && onCancelEdit ? onCancelEdit : onBack}
          backLabel={
            editFromFinished ? t('events.detail.guestFinished.cancelEdit') : undefined
          }
          onContinue={() => onPhaseChange('review')}
        />
      ) : (
        <GiftReviewView
          selectedProducts={selectedProducts}
          hasAttendingGuests={hasAttendingGuests}
          onBackToBrowse={() => onPhaseChange('browse')}
          onConfirm={() => {
            onGiftsConfirmed(
              buildCheckoutSnapshotFromProducts(event.id, selectedProducts),
            )
          }}
        />
      )}
    </GuestFlowContentPanel>
  )
}

import { CheckOutlined, GiftOutlined, PlusOutlined } from '@ant-design/icons'
import type { Product } from '@/shared/types/api'
import './eventGuestGift.css'

const priceFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

export function formatGuestGiftProductPrice(product: Product, freeLabel: string) {
  if (product.is_free || product.value === 0) return freeLabel
  return priceFormatter.format(product.value / 100)
}

export type GuestGiftProductCardProps = {
  product: Product
  freeLabel: string
  selected: boolean
  onToggle?: () => void
  onPreviewImage?: () => void
  previewImageLabel?: string
}

export function GuestGiftProductCard({
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
          <span className="guest-gift-card-price">{formatGuestGiftProductPrice(product, freeLabel)}</span>
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

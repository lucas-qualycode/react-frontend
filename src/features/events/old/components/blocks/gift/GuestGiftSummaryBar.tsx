import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import './eventGuestGift.css'

const { Text } = Typography

const priceFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

type Props = {
  selectedCount: number
  totalCents: number
}

export function GuestGiftSummaryBar({ selectedCount, totalCents }: Props) {
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

import { Collapse, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  giftCheckoutLineItems,
  giftCheckoutTotalCents,
  type GuestCheckoutSnapshot,
} from '../../invitationFlow/lib/guestCheckoutSession'

const { Text } = Typography

const priceFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

type Props = {
  checkout: GuestCheckoutSnapshot
}

function formatLinePrice(cents: number, freeLabel: string): string {
  if (cents === 0) return freeLabel
  return priceFormatter.format(cents / 100)
}

export function GuestMpPaymentGiftsSummary({ checkout }: Props) {
  const { t } = useTranslation()

  const freeLabel = t('events.detail.guestGift.free')
  const totalLabel = priceFormatter.format(giftCheckoutTotalCents(checkout) / 100)

  const giftLineItems = giftCheckoutLineItems(checkout)
  if (giftLineItems.length === 0) return null

  return (
    <div className="guest-mp-payment-gifts-summary">
      <Text strong className="guest-mp-payment-gifts-summary-heading">
        {t('events.detail.guestMpPayment.summary')}
      </Text>
      <Collapse
        bordered={false}
        className="guest-mp-payment-gifts-collapse"
        defaultActiveKey={[]}
        items={[
          {
            key: 'gifts',
            label: (
              <div className="guest-mp-payment-gifts-summary-label">
                <Text strong>{t('events.detail.guestMpPayment.total')}</Text>
                <Text strong className="guest-mp-payment-gifts-summary-total">
                  {totalLabel}
                </Text>
              </div>
            ),
            children: (
              <div className="guest-mp-payment-gifts-summary-details">
                {giftLineItems.map((item) => (
                  <div key={item.product_id} className="guest-mp-payment-gifts-summary-row">
                    <Text>{item.name}</Text>
                    <Text>{formatLinePrice(item.total_price_cents, freeLabel)}</Text>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

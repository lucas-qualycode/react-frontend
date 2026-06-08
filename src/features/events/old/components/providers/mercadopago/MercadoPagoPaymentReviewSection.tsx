import { CreditCardOutlined } from '@ant-design/icons'
import { Flex, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildFallbackInstallmentOptions,
  formatCardPaymentTotalReviewLabel,
  resolveInstallmentDisplayAmounts,
} from '../../blocks/mpPayment/guestMpInstallments'
import type { GuestPaymentReviewSectionProps } from '../../blocks/payment/types'
import { GuestReviewSection } from '../../blocks/review/GuestReviewSection'

const { Text } = Typography

const paymentPriceFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'BRL',
})

function PaymentReviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="guest-review-payment-field">
      <Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 16 }}>{value}</Text>
    </div>
  )
}

function formatPaymentDocument(type: string, number: string): string {
  const digits = number.replace(/\D/g, '')
  if (!digits) return ''
  const normalizedType = type.trim().toUpperCase()
  return normalizedType ? `${normalizedType} ${digits}` : digits
}

export function MercadoPagoPaymentReviewSection({
  checkout,
  paymentSnapshot,
  cardPayment,
}: GuestPaymentReviewSectionProps) {
  const { t, i18n } = useTranslation()
  const totalCents = checkout?.total_cents ?? 0
  const totalLabel = paymentPriceFormatter.format(totalCents / 100)

  let body: ReactNode
  if (totalCents <= 0) {
    body = <Text type="secondary">{t('events.detail.guestReview.paymentNotRequired')}</Text>
  } else if (!paymentSnapshot) {
    body = <Text type="secondary">{t('events.detail.guestReview.paymentPending')}</Text>
  } else if (paymentSnapshot.method === 'pix') {
    body = (
      <Flex vertical gap={10}>
        <PaymentReviewField
          label={t('events.detail.guestReview.paymentMethodLabel')}
          value={t('events.detail.guestMpPayment.methodPix')}
        />
        <PaymentReviewField label={t('events.detail.guestGift.total')} value={totalLabel} />
        <PaymentReviewField
          label={t('events.detail.guestMpPayment.payerEmail')}
          value={paymentSnapshot.payer.email}
        />
      </Flex>
    )
  } else {
    const card = { ...cardPayment, ...paymentSnapshot.card }
    const document = formatPaymentDocument(card.identificationType, card.identificationNumber)
    const installmentOptions =
      totalCents > 0 ? buildFallbackInstallmentOptions(totalCents, i18n.language, t) : []
    const { installments, installmentAmount, installmentTotalAmount } =
      resolveInstallmentDisplayAmounts(card, totalCents, installmentOptions)
    const methodLabel =
      card.paymentTypeId === 'debit_card'
        ? t('events.detail.guestMpPayment.methodDebitCard')
        : t('events.detail.guestMpPayment.methodCreditCard')
    const totalWithInstallmentsLabel = formatCardPaymentTotalReviewLabel(
      installments,
      installmentAmount,
      installmentTotalAmount,
      i18n.language,
      t,
    )

    body = (
      <Flex vertical gap={10}>
        <PaymentReviewField
          label={t('events.detail.guestReview.paymentMethodLabel')}
          value={methodLabel}
        />
        <PaymentReviewField
          label={t('events.detail.guestGift.total')}
          value={totalWithInstallmentsLabel}
        />
        <PaymentReviewField
          label={t('events.detail.guestMpPayment.payerEmail')}
          value={card.payerEmail}
        />
        {document ? (
          <PaymentReviewField
            label={t('events.detail.guestMpPayment.payerDocument')}
            value={document}
          />
        ) : null}
      </Flex>
    )
  }

  return body
}

export function MercadoPagoPaymentReviewSectionShell({
  checkout,
  paymentSnapshot,
  cardPayment,
  editLabel,
  onEdit,
}: GuestPaymentReviewSectionProps & {
  editLabel?: string
  onEdit?: () => void
}) {
  const { t } = useTranslation()

  return (
    <GuestReviewSection
      id="guest-review-payment-heading"
      icon={<CreditCardOutlined />}
      title={t('events.detail.guestReview.sectionPayment')}
      editLabel={editLabel}
      onEdit={onEdit}
    >
      <MercadoPagoPaymentReviewSection
        checkout={checkout}
        paymentSnapshot={paymentSnapshot}
        cardPayment={cardPayment}
      />
    </GuestReviewSection>
  )
}

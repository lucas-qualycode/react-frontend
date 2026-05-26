import { getGuestPaymentProvider } from './registry'
import type { GuestPaymentReviewSectionProps } from './types'

type Props = GuestPaymentReviewSectionProps & {
  editLabel?: string
  onEdit?: () => void
}

export function GuestPaymentReviewSection({
  checkout,
  paymentSnapshot,
  cardPayment,
  editLabel,
  onEdit,
}: Props) {
  if (!paymentSnapshot) {
    const DefaultProvider = getGuestPaymentProvider('mercadopago').PaymentReviewSection
    return (
      <DefaultProvider
        checkout={checkout}
        paymentSnapshot={null}
        cardPayment={cardPayment}
        editLabel={editLabel}
        onEdit={onEdit}
      />
    )
  }

  const ProviderSection = getGuestPaymentProvider(paymentSnapshot.payment_provider)
    .PaymentReviewSection

  return (
    <ProviderSection
      checkout={checkout}
      paymentSnapshot={paymentSnapshot}
      cardPayment={cardPayment}
      editLabel={editLabel}
      onEdit={onEdit}
    />
  )
}

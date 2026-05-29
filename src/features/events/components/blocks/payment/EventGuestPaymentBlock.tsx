import { CreditCardOutlined, QrcodeOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Spin, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { EventGuestMpPaymentBlock } from '../mpPayment/EventGuestMpPaymentBlock'
import type { GuestCardPaymentPersisted } from '../mpPayment/guestMpPaymentDraft'
import type { GuestCardPaymentSecrets } from '../mpPayment/guestMpPaymentForm'
import { GuestMpPaymentGiftsSummary } from '../mpPayment/GuestMpPaymentGiftsSummary'
import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import type { GuestPaymentMethodChoice } from '../../invitationFlow/lib/guestFlowDraft'
import { GuestFlowActions } from '../../invitationFlow/shared/GuestFlowActions'
import { GuestFlowBlockHeader } from '../../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestFlowContentPanel } from '../../invitationFlow/shared/GuestFlowContentPanel'
import type { GuestPaymentSnapshot } from './types'
import type { PixDisplayPayload } from './checkoutPayload'
import type { GuestPaymentPageMode } from '../../guestPayment/useGuestPaymentSession'
import type { EventGuestPaymentVariant } from '../../invitationFlow/types'
import { useGuestInvitationPhase } from '@/features/events/context/GuestInvitationPhaseContext'
import './eventGuestPayment.css'

const { Text } = Typography

type Props = {
  event: Event
  variant: EventGuestPaymentVariant
  checkout: GuestCheckoutSnapshot | null
  mode: GuestPaymentPageMode
  pix: PixDisplayPayload | null | undefined
  remainingSeconds: number | null
  totalCents: number
  failureMessage: string | null
  paymentMethod: GuestPaymentMethodChoice | null
  onPaymentMethodChange: (method: GuestPaymentMethodChoice | null) => void
  pixPayerEmail: string
  onPixPayerEmailChange: (email: string) => void
  cardPayment: GuestCardPaymentPersisted
  onCardPaymentChange: (card: GuestCardPaymentPersisted) => void
  cardSecrets: GuestCardPaymentSecrets
  onCardSecretsChange: (secrets: GuestCardPaymentSecrets) => void
  onPaymentComplete: (snapshot: GuestPaymentSnapshot) => void
  onCopyPix: () => void
  onPayAgain: () => void
  paySubmitting: boolean
}

function formatCountdown(totalSeconds: number | null): string | null {
  if (totalSeconds === null) return null
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function resolveHeaderIcon(mode: GuestPaymentPageMode) {
  if (mode === 'card_pending' || mode === 'redirecting') {
    return <CreditCardOutlined />
  }
  return <QrcodeOutlined />
}

function resolveSubtitle(mode: GuestPaymentPageMode, t: (key: string) => string): string {
  if (mode === 'pix_pending') return t('events.detail.guestPayment.pixInstructions')
  if (mode === 'card_pending' || mode === 'redirecting') {
    return t('events.detail.guestPayment.processingCard')
  }
  if (mode === 'retry' || mode === 'failed') {
    return t('events.detail.guestPayment.subtitle')
  }
  return t('events.detail.guestPayment.subtitle')
}

export function EventGuestPaymentBlock({
  event,
  variant,
  checkout,
  mode,
  pix,
  remainingSeconds,
  totalCents,
  failureMessage,
  paymentMethod,
  onPaymentMethodChange,
  pixPayerEmail,
  onPixPayerEmailChange,
  cardPayment,
  onCardPaymentChange,
  cardSecrets,
  onCardSecretsChange,
  onPaymentComplete,
  onCopyPix,
  onPayAgain,
  paySubmitting,
}: Props) {
  const { t } = useTranslation()
  const { goToWizard } = useGuestInvitationPhase()

  const amountLabel = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'BRL',
      }).format(totalCents / 100),
    [totalCents],
  )

  const countdownLabel = formatCountdown(remainingSeconds)
  const showRetryPanel = mode === 'retry' || mode === 'failed'

  if (variant !== 'wedding') return null

  return (
    <GuestFlowContentPanel panelSize="stable">
      <GuestFlowBlockHeader
        icon={resolveHeaderIcon(mode)}
        title={t('events.detail.guestPayment.title')}
        subtitle={resolveSubtitle(mode, t)}
      />

      {checkout ? <GuestMpPaymentGiftsSummary checkout={checkout} /> : null}

      {mode === 'loading' ? (
        <Flex align="center" justify="center" style={{ minHeight: 200, width: '100%' }}>
          <Spin size="large" />
        </Flex>
      ) : null}

      {mode === 'unavailable' ? (
        <Flex vertical gap={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={t('events.detail.guestPayment.noPaymentTitle')}
            description={t('events.detail.guestPayment.noPaymentDescription')}
          />
          <GuestFlowActions>
            <Button
              type="primary"
              size="large"
              onClick={goToWizard}
            >
              {t('events.detail.guestPayment.backToInvitation')}
            </Button>
          </GuestFlowActions>
        </Flex>
      ) : null}

      {mode === 'pix_pending' ? (
        <Flex vertical align="center" gap={16} className="guest-payment-pix-panel">
          <Text strong className="guest-payment-amount">
            {amountLabel}
          </Text>
          {pix?.qr_code_base64 ? (
            <img
              className="guest-payment-qr"
              src={`data:image/png;base64,${pix.qr_code_base64}`}
              alt={t('events.detail.guestPayment.qrAlt')}
            />
          ) : null}
          {pix?.copy_paste_code ? (
            <Button type="primary" size="large" onClick={onCopyPix}>
              {t('events.detail.guestPayment.copyPix')}
            </Button>
          ) : null}
          {countdownLabel ? (
            <Text type="secondary">
              {t('events.detail.guestPayment.expiresIn', { time: countdownLabel })}
            </Text>
          ) : null}
          <Flex align="center" gap={8}>
            <Spin size="small" />
            <Text>{t('events.detail.guestPayment.waitingPix')}</Text>
          </Flex>
        </Flex>
      ) : null}

      {mode === 'card_pending' || mode === 'redirecting' ? (
        <Flex vertical align="center" justify="center" gap={16} style={{ minHeight: 200, width: '100%' }}>
          <Spin size="large" />
          <Text>{t('events.detail.guestPayment.processingCard')}</Text>
        </Flex>
      ) : null}

      {showRetryPanel ? (
        <Flex vertical gap={16} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message={t('events.detail.guestPayment.failedTitle')}
            description={failureMessage ?? t('events.detail.guestPayment.failedDescription')}
          />
          {checkout ? (
            <>
              <EventGuestMpPaymentBlock
                event={event}
                variant="wedding"
                checkout={checkout}
                method={paymentMethod}
                onMethodChange={onPaymentMethodChange}
                pixPayerEmail={pixPayerEmail}
                onPixPayerEmailChange={onPixPayerEmailChange}
                cardPayment={cardPayment}
                onCardPaymentChange={onCardPaymentChange}
                cardSecrets={cardSecrets}
                onCardSecretsChange={onCardSecretsChange}
                onPaymentComplete={onPaymentComplete}
                onBack={() => undefined}
                embedded
              />
              <GuestFlowActions>
                <Button
                  type="primary"
                  size="large"
                  loading={paySubmitting}
                  onClick={onPayAgain}
                >
                  {t('events.detail.guestPayment.payAgain')}
                </Button>
              </GuestFlowActions>
            </>
          ) : (
            <Alert type="error" message={t('events.detail.guestPayment.missingCheckout')} />
          )}
        </Flex>
      ) : null}
    </GuestFlowContentPanel>
  )
}

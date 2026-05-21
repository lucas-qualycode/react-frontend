import { CreditCardOutlined, QrcodeOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Select, Typography, message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { useMercadoPago } from '@/features/events/hooks/useMercadoPago'
import type { GuestCheckoutSnapshot } from '../guestCheckoutSession'
import type { GuestCardPaymentPersisted, GuestMpPaymentSnapshot } from '../guestMpPaymentDraft'
import {
  buildCardPaymentSnapshot,
  buildPixPaymentSnapshot,
  cardBin,
  normalizeCpf,
  validateCardPaymentForm,
  type GuestCardPaymentSecrets,
} from '../guestMpPaymentForm'
import { GuestFlowActions } from '../GuestFlowActions'
import { GuestFlowBlockHeader } from '../GuestFlowBlockHeader'
import { GuestFlowBorderField } from '../GuestFlowBorderField'
import { GuestFlowContentPanel } from '../GuestFlowContentPanel'
import type { GuestPaymentMethodChoice } from '../guestFlowDraft'
import type { EventGuestMpPaymentVariant } from '../types'
import '../eventGuestMpPayment.css'

const { Text } = Typography

const INSTALLMENT_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

type Props = {
  event: Event
  variant: EventGuestMpPaymentVariant
  checkout: GuestCheckoutSnapshot
  method: GuestPaymentMethodChoice | null
  onMethodChange: (method: GuestPaymentMethodChoice | null) => void
  pixPayerEmail: string
  onPixPayerEmailChange: (email: string) => void
  cardPayment: GuestCardPaymentPersisted
  onCardPaymentChange: (card: GuestCardPaymentPersisted) => void
  cardSecrets: GuestCardPaymentSecrets
  onCardSecretsChange: (secrets: GuestCardPaymentSecrets) => void
  onPaymentComplete: (snapshot: GuestMpPaymentSnapshot) => void
  onBack: () => void
}

export function EventGuestMpPaymentBlock({
  variant,
  checkout: _checkout,
  method,
  onMethodChange,
  pixPayerEmail,
  onPixPayerEmailChange,
  cardPayment,
  onCardPaymentChange,
  cardSecrets,
  onCardSecretsChange,
  onPaymentComplete,
  onBack,
}: Props) {
  const { t } = useTranslation()
  const { isConfigured, isReady, error: mpLoadError, fetchIdentificationTypes, fetchPaymentMethodsForBin } =
    useMercadoPago()
  const [docTypes, setDocTypes] = useState([{ id: 'CPF', name: 'CPF' }])
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({})
  const cardPaymentRef = useRef(cardPayment)
  cardPaymentRef.current = cardPayment

  useEffect(() => {
    if (method !== 'card' || !isConfigured || !isReady) return
    void fetchIdentificationTypes().then(setDocTypes)
  }, [fetchIdentificationTypes, isConfigured, isReady, method])

  useEffect(() => {
    const bin = cardBin(cardSecrets.cardNumber)
    if (method !== 'card' || !isConfigured || !isReady || bin.length < 6) {
      setPaymentMethodLabel('')
      return
    }

    void fetchPaymentMethodsForBin(cardSecrets.cardNumber).then((methods) => {
      const primary = methods[0]
      if (!primary) {
        setPaymentMethodLabel('')
        onCardPaymentChange({ ...cardPaymentRef.current, paymentMethodId: '' })
        return
      }
      setPaymentMethodLabel(primary.name)
      onCardPaymentChange({ ...cardPaymentRef.current, paymentMethodId: primary.id })
    })
  }, [cardSecrets.cardNumber, fetchPaymentMethodsForBin, isConfigured, isReady, method, onCardPaymentChange])

  const patchCard = useCallback(
    (patch: Partial<GuestCardPaymentPersisted>) => {
      setFieldErrors((current) => {
        const next = { ...current }
        for (const key of Object.keys(patch)) {
          delete next[key]
        }
        return next
      })
      onCardPaymentChange({ ...cardPayment, ...patch })
    },
    [cardPayment, onCardPaymentChange],
  )

  const patchSecrets = useCallback(
    (patch: Partial<GuestCardPaymentSecrets>) => {
      setFieldErrors((current) => {
        const next = { ...current }
        for (const key of Object.keys(patch)) {
          delete next[key]
        }
        return next
      })
      onCardSecretsChange({ ...cardSecrets, ...patch })
    },
    [cardSecrets, onCardSecretsChange],
  )

  const handleContinue = useCallback(() => {
    if (!method) {
      message.warning(t('events.detail.guestMpPayment.validation.chooseMethod'))
      return
    }

    if (method === 'pix') {
      const email = pixPayerEmail.trim()
      if (!email) {
        message.error(t('events.detail.guestMpPayment.validation.required'))
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        message.error(t('events.detail.guestMpPayment.validation.emailInvalid'))
        return
      }
      onPaymentComplete(buildPixPaymentSnapshot({ email }))
      return
    }

    const validation = validateCardPaymentForm(
      { ...cardPayment, ...cardSecrets },
      t,
      { requirePaymentMethod: isConfigured && isReady },
    )
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors)
      message.error(t('events.detail.guestMpPayment.validation.formInvalid'))
      return
    }

    if (isConfigured && !isReady) {
      message.error(t('events.detail.guestMpPayment.validation.mpNotReady'))
      return
    }

    onPaymentComplete(buildCardPaymentSnapshot(cardPayment))
  }, [
    cardPayment,
    cardSecrets,
    isConfigured,
    isReady,
    method,
    onPaymentComplete,
    pixPayerEmail,
    t,
  ])

  if (variant !== 'wedding') return null

  return (
    <GuestFlowContentPanel panelSize="fit">
      <GuestFlowBlockHeader
        icon={<CreditCardOutlined />}
        title={t('events.detail.guestMpPayment.title')}
        subtitle={t('events.detail.guestMpPayment.subtitle')}
      />

      <Flex vertical gap={10} style={{ width: '100%' }}>
        <Text strong>{t('events.detail.guestMpPayment.chooseMethod')}</Text>
        <div className="guest-mp-payment-methods">
          <button
            type="button"
            className={`guest-mp-payment-method-card${method === 'card' ? ' is-selected' : ''}`}
            onClick={() => onMethodChange('card')}
          >
            <CreditCardOutlined style={{ fontSize: 22 }} />
            <Text>{t('events.detail.guestMpPayment.methodCard')}</Text>
          </button>
          <button
            type="button"
            className={`guest-mp-payment-method-card${method === 'pix' ? ' is-selected' : ''}`}
            onClick={() => onMethodChange('pix')}
          >
            <QrcodeOutlined style={{ fontSize: 22 }} />
            <Text>{t('events.detail.guestMpPayment.methodPix')}</Text>
          </button>
        </div>
      </Flex>

      {method === 'card' && (
        <Flex vertical gap={12} style={{ width: '100%' }}>
          {!isConfigured && (
            <Alert type="warning" showIcon message={t('events.detail.guestMpPayment.mockModeWarning')} />
          )}
          {mpLoadError && <Alert type="error" showIcon message={mpLoadError} />}

          <GuestFlowBorderField
            label={t('events.detail.guestMpPayment.cardNumber')}
            required
            value={cardSecrets.cardNumber}
            onChange={(e) => patchSecrets({ cardNumber: e.target.value })}
            placeholder="0000 0000 0000 0000"
            autoComplete="cc-number"
            hasError={Boolean(fieldErrors.cardNumber)}
          />

          <GuestFlowBorderField
            label={t('events.detail.guestMpPayment.cardholderName')}
            required
            value={cardPayment.cardholderName}
            onChange={(e) => patchCard({ cardholderName: e.target.value })}
            autoComplete="cc-name"
            hasError={Boolean(fieldErrors.cardholderName)}
          />

          <div className="guest-mp-payment-expiry-row">
            <GuestFlowBorderField
              label={t('events.detail.guestMpPayment.expirationMonth')}
              required
              value={cardPayment.expirationMonth}
              onChange={(e) =>
                patchCard({ expirationMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })
              }
              placeholder="MM"
              autoComplete="cc-exp-month"
              hasError={Boolean(fieldErrors.expirationMonth)}
            />
            <GuestFlowBorderField
              label={t('events.detail.guestMpPayment.expirationYear')}
              required
              value={cardPayment.expirationYear}
              onChange={(e) =>
                patchCard({ expirationYear: e.target.value.replace(/\D/g, '').slice(0, 4) })
              }
              placeholder="AAAA"
              autoComplete="cc-exp-year"
              hasError={Boolean(fieldErrors.expirationYear)}
            />
            <GuestFlowBorderField
              label={t('events.detail.guestMpPayment.securityCode')}
              required
              value={cardSecrets.securityCode}
              onChange={(e) => patchSecrets({ securityCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              placeholder="CVV"
              autoComplete="cc-csc"
              hasError={Boolean(fieldErrors.securityCode)}
            />
          </div>

          <GuestFlowBorderField
            label={t('events.detail.guestMpPayment.payerEmail')}
            required
            type="email"
            value={cardPayment.payerEmail}
            onChange={(e) => patchCard({ payerEmail: e.target.value })}
            autoComplete="email"
            hasError={Boolean(fieldErrors.payerEmail)}
          />

          <Flex vertical gap={8} style={{ width: '100%', textAlign: 'left' }}>
            <Text className="guest-mp-payment-field-label">
              {t('events.detail.guestMpPayment.payerDocType')}
              <span className="guest-mp-payment-field-required"> *</span>
            </Text>
            <Select
              size="large"
              value={cardPayment.identificationType || undefined}
              options={docTypes.map((type) => ({ value: type.id, label: type.name }))}
              onChange={(value) => patchCard({ identificationType: value })}
              status={fieldErrors.identificationType ? 'error' : undefined}
            />
          </Flex>

          <GuestFlowBorderField
            label={t('events.detail.guestMpPayment.payerCpf')}
            required
            value={cardPayment.identificationNumber}
            onChange={(e) => patchCard({ identificationNumber: normalizeCpf(e.target.value) })}
            placeholder="00000000000"
            hasError={Boolean(fieldErrors.identificationNumber)}
          />

          <Flex vertical gap={8} style={{ width: '100%', textAlign: 'left' }}>
            <Text className="guest-mp-payment-field-label">
              {t('events.detail.guestMpPayment.installments')}
              <span className="guest-mp-payment-field-required"> *</span>
            </Text>
            <Select
              size="large"
              value={cardPayment.installments}
              options={INSTALLMENT_OPTIONS.map((count) => ({
                value: count,
                label: t('events.detail.guestMpPayment.installmentOption', { count }),
              }))}
              onChange={(value) => patchCard({ installments: value })}
            />
          </Flex>

          {paymentMethodLabel ? (
            <Text type="secondary" style={{ fontSize: 14 }}>
              {t('events.detail.guestMpPayment.detectedMethod', { method: paymentMethodLabel })}
            </Text>
          ) : null}

          {fieldErrors.paymentMethodId ? (
            <Text type="danger" style={{ fontSize: 14 }}>
              {fieldErrors.paymentMethodId}
            </Text>
          ) : null}
        </Flex>
      )}

      {method === 'pix' && (
        <Flex vertical gap={12} style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
            {t('events.detail.guestMpPayment.pixHint')}
          </Text>
          <GuestFlowBorderField
            label={t('events.detail.guestMpPayment.payerEmail')}
            required
            type="email"
            value={pixPayerEmail}
            onChange={(e) => onPixPayerEmailChange(e.target.value)}
            autoComplete="email"
          />
        </Flex>
      )}

      <GuestFlowActions>
        <Button size="large" onClick={onBack}>
          {t('events.detail.guestMpPayment.back')}
        </Button>
        <Button type="primary" size="large" onClick={handleContinue} disabled={!method}>
          {t('events.detail.guestMpPayment.continue')}
        </Button>
      </GuestFlowActions>
    </GuestFlowContentPanel>
  )
}

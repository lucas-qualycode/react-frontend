import {
  BankOutlined,
  CheckCircleFilled,
  CreditCardOutlined,
  QrcodeOutlined,
} from '@ant-design/icons'
import { Alert, Button, Flex, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import { useMercadoPago } from '@/features/events/hooks/useMercadoPago'
import {
  buildFallbackInstallmentOptions,
  buildInstallmentOptionsFromMpCosts,
  resolveCardPaymentInstallments,
  type GuestInstallmentOption,
} from './guestMpInstallments'
import type { GuestCheckoutSnapshot } from '../../invitationFlow/lib/guestCheckoutSession'
import type { GuestPaymentSnapshot } from '../payment/types'
import type { GuestCardPaymentPersisted } from './guestMpPaymentDraft'
import {
  buildCardPaymentSnapshot,
  buildPixPaymentSnapshot,
  cardBin,
  GUEST_IDENTIFICATION_DOC_TYPES,
  identificationPlaceholder,
  mergeIdentificationDocTypes,
  normalizeIdentificationNumber,
  validateCardPaymentForm,
  type CardFormValidation,
  type GuestCardPaymentSecrets,
} from './guestMpPaymentForm'
import { GuestFlowActions } from '../../invitationFlow/shared/GuestFlowActions'
import { GuestFlowBlockHeader } from '../../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestFlowBorderField } from '../../invitationFlow/shared/GuestFlowBorderField'
import { GuestFlowBorderIdentificationField } from '../../invitationFlow/shared/GuestFlowBorderIdentificationField'
import { GuestFlowBorderSelect } from '../../invitationFlow/shared/GuestFlowBorderSelect'
import { GuestPaymentCardFlip } from './GuestPaymentCardFlip'
import { GuestFlowContentPanel } from '../../invitationFlow/shared/GuestFlowContentPanel'
import { GuestMpPaymentGiftsSummary } from './GuestMpPaymentGiftsSummary'
import {
  isGuestCardPaymentMethod,
  paymentTypeIdForGuestMethod,
  type GuestPaymentMethodChoice,
} from '../../invitationFlow/lib/guestFlowDraft'
import type { EventGuestMpPaymentVariant } from '../../invitationFlow/types'
import './eventGuestMpPayment.css'

const { Text } = Typography

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
  onPaymentComplete: (snapshot: GuestPaymentSnapshot) => void
  onBack: () => void
  showActions?: boolean
  embedded?: boolean
  navigationFieldErrors?: CardFormValidation['fieldErrors']
  onNavigationFieldErrorsClear?: () => void
}

export function EventGuestMpPaymentBlock({
  variant,
  checkout,
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
  embedded = false,
  showActions = !embedded,
  navigationFieldErrors,
  onNavigationFieldErrorsClear,
}: Props) {
  const { t, i18n } = useTranslation()
  const {
    isConfigured,
    isReady,
    error: mpLoadError,
    fetchIdentificationTypes,
    fetchPaymentMethodsForBin,
    fetchInstallmentsForBin,
  } = useMercadoPago()
  const [docTypes, setDocTypes] = useState<Array<{ id: string; name: string }>>([
    ...GUEST_IDENTIFICATION_DOC_TYPES,
  ])
  const docTypeOptions = useMemo(
    () =>
      mergeIdentificationDocTypes(docTypes).map((type) => ({
        value: type.id,
        label: type.name,
      })),
    [docTypes],
  )
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('')
  const [installmentOptions, setInstallmentOptions] = useState<GuestInstallmentOption[]>([])
  const [installmentsLoading, setInstallmentsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({})
  const displayFieldErrors = useMemo(
    () => ({ ...fieldErrors, ...(navigationFieldErrors ?? {}) }),
    [fieldErrors, navigationFieldErrors],
  )
  const cardPaymentRef = useRef(cardPayment)
  cardPaymentRef.current = cardPayment
  const installmentOptionsRef = useRef(installmentOptions)
  installmentOptionsRef.current = installmentOptions
  const isCreditCard = method === 'credit_card'

  const handleMethodChange = useCallback(
    (nextMethod: GuestPaymentMethodChoice | null) => {
      onNavigationFieldErrorsClear?.()
      onMethodChange(nextMethod)
      if (!isGuestCardPaymentMethod(nextMethod)) return

      const paymentTypeId = paymentTypeIdForGuestMethod(nextMethod)!
      const patch: Partial<GuestCardPaymentPersisted> = { paymentTypeId }
      if (nextMethod === 'debit_card') {
        patch.installments = 1
        patch.installmentAmount = 0
        patch.installmentTotalAmount = 0
        patch.paymentMethodId = ''
      }
      onCardPaymentChange({ ...cardPaymentRef.current, ...patch })
    },
    [onCardPaymentChange, onMethodChange],
  )

  useEffect(() => {
    if (!isGuestCardPaymentMethod(method) || !isConfigured || !isReady) return
    void fetchIdentificationTypes().then((types) => setDocTypes(mergeIdentificationDocTypes(types)))
  }, [fetchIdentificationTypes, isConfigured, isReady, method])

  useEffect(() => {
    const bin = cardBin(cardSecrets.cardNumber)
    if (!isGuestCardPaymentMethod(method) || !isConfigured || !isReady || bin.length < 6) {
      setPaymentMethodLabel('')
      return
    }

    const expectedType = paymentTypeIdForGuestMethod(method)

    void fetchPaymentMethodsForBin(cardSecrets.cardNumber).then((methods) => {
      const match =
        (expectedType
          ? methods.find((entry) => entry.payment_type_id === expectedType)
          : undefined) ?? methods[0]
      if (!match) {
        setPaymentMethodLabel('')
        onCardPaymentChange({
          ...cardPaymentRef.current,
          paymentMethodId: '',
          paymentTypeId: expectedType ?? cardPaymentRef.current.paymentTypeId,
        })
        return
      }
      setPaymentMethodLabel(match.name)
      onCardPaymentChange({
        ...cardPaymentRef.current,
        paymentMethodId: match.id,
        paymentTypeId: expectedType ?? cardPaymentRef.current.paymentTypeId,
      })
    })
  }, [cardSecrets.cardNumber, fetchPaymentMethodsForBin, isConfigured, isReady, method, onCardPaymentChange])

  useEffect(() => {
    if (!isGuestCardPaymentMethod(method) || checkout.total_cents <= 0) {
      setInstallmentOptions([])
      return
    }

    if (method === 'debit_card') {
      setInstallmentsLoading(false)
      setInstallmentOptions([])
      const totalAmount = checkout.total_cents / 100
      onCardPaymentChange({
        ...cardPaymentRef.current,
        installments: 1,
        installmentAmount: totalAmount,
        installmentTotalAmount: totalAmount,
        paymentTypeId: 'debit_card',
      })
      return
    }

    const bin = cardBin(cardSecrets.cardNumber)
    if (bin.length < 6) {
      setInstallmentsLoading(false)
      setInstallmentOptions([])
      if (cardPaymentRef.current.installments !== 1) {
        onCardPaymentChange({
          ...cardPaymentRef.current,
          installments: 1,
          installmentAmount: 0,
          installmentTotalAmount: 0,
        })
      }
      return
    }

    if (!isConfigured || !isReady) {
      setInstallmentsLoading(false)
      const fallback = buildFallbackInstallmentOptions(
        checkout.total_cents,
        i18n.language,
        t,
      )
      setInstallmentOptions(fallback)
      const currentInstallments = cardPaymentRef.current.installments
      const matched =
        fallback.find((option) => option.installments === currentInstallments) ?? fallback[0]
      if (matched) {
        onCardPaymentChange({
          ...cardPaymentRef.current,
          installments: matched.installments,
          installmentAmount: matched.installmentAmount,
          installmentTotalAmount: matched.totalAmount,
          paymentTypeId: 'credit_card',
        })
      }
      return
    }

    let cancelled = false
    setInstallmentsLoading(true)
    setInstallmentOptions([])

    void fetchInstallmentsForBin(checkout.total_cents, cardSecrets.cardNumber, i18n.language)
      .then((costs) => {
        if (cancelled) return
        if (costs.length === 0) {
          setInstallmentOptions([])
          return
        }
        const options = buildInstallmentOptionsFromMpCosts(costs, i18n.language, t)
        setInstallmentOptions(options)

        const currentInstallments = cardPaymentRef.current.installments
        const matched =
          options.find((option) => option.installments === currentInstallments) ?? options[0]
        if (matched) {
          onCardPaymentChange({
            ...cardPaymentRef.current,
            installments: matched.installments,
            installmentAmount: matched.installmentAmount,
            installmentTotalAmount: matched.totalAmount,
            paymentTypeId: 'credit_card',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setInstallmentsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    cardSecrets.cardNumber,
    checkout.total_cents,
    fetchInstallmentsForBin,
    i18n.language,
    isConfigured,
    isReady,
    method,
    onCardPaymentChange,
    t,
  ])

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
      onNavigationFieldErrorsClear?.()
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

    const resolvedCard = resolveCardPaymentInstallments(
      {
        ...cardPaymentRef.current,
        paymentTypeId: paymentTypeIdForGuestMethod(method) ?? 'credit_card',
      },
      method === 'credit_card' ? installmentOptionsRef.current : [],
      checkout.total_cents,
    )
    onCardPaymentChange(resolvedCard)
    onPaymentComplete(buildCardPaymentSnapshot(resolvedCard))
  }, [
    cardPayment,
    cardSecrets,
    checkout.total_cents,
    isConfigured,
    isReady,
    method,
    onCardPaymentChange,
    onPaymentComplete,
    pixPayerEmail,
    t,
  ])

  if (variant !== 'wedding') return null

  const content = (
    <>
      {!embedded ? (
        <GuestFlowBlockHeader
          icon={<CreditCardOutlined />}
          title={t('events.detail.guestMpPayment.title')}
          subtitle={t('events.detail.guestMpPayment.subtitle')}
        />
      ) : null}

      {!embedded ? <GuestMpPaymentGiftsSummary checkout={checkout} /> : null}

      <Flex vertical gap={10} style={{ width: '100%' }}>
        <Text strong>{t('events.detail.guestMpPayment.chooseMethod')}</Text>
        <div className="guest-mp-payment-methods">
          <button
            type="button"
            className={`guest-mp-payment-method-card${method === 'pix' ? ' is-selected' : ''}`}
            onClick={() => handleMethodChange('pix')}
            aria-pressed={method === 'pix'}
          >
            <QrcodeOutlined className="guest-mp-payment-method-type-icon" />
            <span className="guest-mp-payment-method-label">
              <Text>{t('events.detail.guestMpPayment.methodPix')}</Text>
            </span>
            {method === 'pix' ? (
              <CheckCircleFilled
                className="guest-mp-payment-method-selected-icon"
                aria-hidden
              />
            ) : null}
          </button>
          <button
            type="button"
            className={`guest-mp-payment-method-card${method === 'credit_card' ? ' is-selected' : ''}`}
            onClick={() => handleMethodChange('credit_card')}
            aria-pressed={method === 'credit_card'}
          >
            <CreditCardOutlined className="guest-mp-payment-method-type-icon" />
            <span className="guest-mp-payment-method-label">
              <Text>{t('events.detail.guestMpPayment.methodCreditCard')}</Text>
            </span>
            {method === 'credit_card' ? (
              <CheckCircleFilled
                className="guest-mp-payment-method-selected-icon"
                aria-hidden
              />
            ) : null}
          </button>
          <button
            type="button"
            className={`guest-mp-payment-method-card${method === 'debit_card' ? ' is-selected' : ''}`}
            onClick={() => handleMethodChange('debit_card')}
            aria-pressed={method === 'debit_card'}
          >
            <BankOutlined className="guest-mp-payment-method-type-icon" />
            <span className="guest-mp-payment-method-label">
              <Text>{t('events.detail.guestMpPayment.methodDebitCard')}</Text>
            </span>
            {method === 'debit_card' ? (
              <CheckCircleFilled
                className="guest-mp-payment-method-selected-icon"
                aria-hidden
              />
            ) : null}
          </button>
        </div>
      </Flex>

      {isGuestCardPaymentMethod(method) && (
        <Flex vertical gap={12} style={{ width: '100%' }}>
          {mpLoadError && <Alert type="error" showIcon message={mpLoadError} />}

          <GuestPaymentCardFlip
            cardPayment={cardPayment}
            cardSecrets={cardSecrets}
            fieldErrors={displayFieldErrors}
            brandId={cardPayment.paymentMethodId}
            brandLabel={paymentMethodLabel}
            onCardChange={patchCard}
            onSecretsChange={patchSecrets}
          />

          {isCreditCard ? (
            <GuestFlowBorderSelect
              label={t('events.detail.guestMpPayment.installments')}
              required
              loading={installmentsLoading}
              disabled={installmentOptions.length === 0}
              placeholder={t('events.detail.guestMpPayment.installmentsPlaceholder')}
              value={installmentOptions.length > 0 ? cardPayment.installments : undefined}
              options={installmentOptions.map((option) => ({
                value: option.installments,
                label: option.label,
              }))}
              onChange={(value) => {
                const option = installmentOptions.find((entry) => entry.installments === value)
                patchCard({
                  installments: value,
                  installmentAmount: option?.installmentAmount ?? 0,
                  installmentTotalAmount: option?.totalAmount ?? 0,
                })
              }}
              hasError={Boolean(displayFieldErrors.installments)}
            />
          ) : null}

          <GuestFlowBorderField
            label={t('events.detail.guestMpPayment.payerEmail')}
            required
            type="email"
            value={cardPayment.payerEmail}
            onChange={(e) => patchCard({ payerEmail: e.target.value })}
            autoComplete="email"
            hasError={Boolean(displayFieldErrors.payerEmail)}
          />

          <GuestFlowBorderIdentificationField
            label={t('events.detail.guestMpPayment.payerDocument')}
            required
            docType={cardPayment.identificationType}
            docNumber={cardPayment.identificationNumber}
            docTypeOptions={docTypeOptions}
            numberPlaceholder={identificationPlaceholder(cardPayment.identificationType)}
            onDocTypeChange={(type) =>
              patchCard({
                identificationType: type,
                identificationNumber: normalizeIdentificationNumber(
                  cardPayment.identificationNumber,
                  type,
                ),
              })
            }
            onDocNumberChange={(value) =>
              patchCard({
                identificationNumber: normalizeIdentificationNumber(
                  value,
                  cardPayment.identificationType,
                ),
              })
            }
            hasError={Boolean(
              displayFieldErrors.identificationType || displayFieldErrors.identificationNumber,
            )}
          />

          {displayFieldErrors.paymentMethodId ? (
            <Text type="danger" style={{ fontSize: 14 }}>
              {displayFieldErrors.paymentMethodId}
            </Text>
          ) : null}
        </Flex>
      )}

      {method === 'pix' && (
        <Flex vertical gap={12} style={{ width: '100%' }}>
          {!embedded ? (
            <Text type="secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
              {t('events.detail.guestMpPayment.pixHint')}
            </Text>
          ) : null}
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

      {showActions ? (
        <GuestFlowActions>
          <Button size="large" onClick={onBack}>
            {t('events.detail.guestMpPayment.back')}
          </Button>
          <Button type="primary" size="large" onClick={handleContinue} disabled={!method}>
            {t('events.detail.guestMpPayment.continue')}
          </Button>
        </GuestFlowActions>
      ) : null}
    </>
  )

  if (embedded) {
    return (
      <Flex vertical align="center" gap={24} style={{ width: '100%' }}>
        {content}
      </Flex>
    )
  }

  return <GuestFlowContentPanel panelSize="fit">{content}</GuestFlowContentPanel>
}

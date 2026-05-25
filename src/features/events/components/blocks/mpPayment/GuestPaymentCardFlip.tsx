import { SwapOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useCallback, useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { GuestCardPaymentPersisted } from './guestMpPaymentDraft'
import {
  clampCardNumber,
  formatCardExpiryDisplay,
  formatCardNumberDisplay,
  parseCardExpiryInput,
  type GuestCardPaymentSecrets,
} from './guestMpPaymentForm'
import { GuestPaymentCardBrandIcon } from './GuestPaymentCardBrandIcon'
import {
  cardBrandFrontClass,
  cardNumberInputMaxLength,
  resolveCardBrand,
} from './guestCardBrand'
import './guestPaymentCard.css'

type Props = {
  cardPayment: GuestCardPaymentPersisted
  cardSecrets: GuestCardPaymentSecrets
  fieldErrors: Partial<Record<string, string>>
  brandId?: string
  brandLabel?: string
  onCardChange: (patch: Partial<GuestCardPaymentPersisted>) => void
  onSecretsChange: (patch: Partial<GuestCardPaymentSecrets>) => void
}

export function GuestPaymentCardFlip({
  cardPayment,
  cardSecrets,
  fieldErrors,
  brandId,
  brandLabel,
  onCardChange,
  onSecretsChange,
}: Props) {
  const { t } = useTranslation()
  const sceneId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [flipped, setFlipped] = useState(false)

  const showFrontError = Boolean(
    fieldErrors.cardNumber || fieldErrors.cardholderName,
  )
  const showBackError = Boolean(
    fieldErrors.expirationMonth ||
      fieldErrors.expirationYear ||
      fieldErrors.securityCode,
  )

  const flipToBack = useCallback(() => setFlipped(true), [])
  const flipToFront = useCallback(() => setFlipped(false), [])
  const toggleFlip = useCallback(() => setFlipped((current) => !current), [])

  useEffect(() => {
    if (showBackError) setFlipped(true)
  }, [showBackError])

  const handleWrapperBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && wrapperRef.current?.contains(next)) return
    if (next instanceof HTMLButtonElement) return
    setFlipped(false)
  }, [])

  const paymentMethodId = cardPayment.paymentMethodId

  const handleCardNumberChange = useCallback(
    (value: string) => {
      onSecretsChange({ cardNumber: clampCardNumber(value, paymentMethodId) })
    },
    [onSecretsChange, paymentMethodId],
  )

  const handleExpiryChange = useCallback(
    (value: string) => {
      const parsed = parseCardExpiryInput(value)
      onCardChange(parsed)
    },
    [onCardChange],
  )

  const resolvedBrand = resolveCardBrand(brandId || cardPayment.paymentMethodId)
  const brandClass = cardBrandFrontClass(resolvedBrand)
  const expiryDisplay = formatCardExpiryDisplay(
    cardPayment.expirationMonth,
    cardPayment.expirationYear,
  )

  return (
    <div
      ref={wrapperRef}
      className="guest-payment-card-wrapper"
      onBlur={handleWrapperBlur}
    >
      <div className="guest-payment-card-scene" id={sceneId}>
        <div className={`guest-payment-card-inner${flipped ? ' is-flipped' : ''}`}>
        <div
          className={`guest-payment-card-face guest-payment-card-face--front${brandClass ? ` ${brandClass}` : ''}${showFrontError ? ' has-error' : ''}`}
        >
          <div className="guest-payment-card-top">
            <div className="guest-payment-card-chip" aria-hidden />
            {resolvedBrand !== 'unknown' ? (
              <GuestPaymentCardBrandIcon
                brand={resolvedBrand}
                className="guest-payment-card-brand-icon"
                aria-label={brandLabel}
              />
            ) : null}
          </div>

          <div className="guest-payment-card-field">
            <label className="guest-payment-card-label" htmlFor={`${sceneId}-number`}>
              {t('events.detail.guestMpPayment.cardNumber')}
            </label>
            <input
              id={`${sceneId}-number`}
              className={`guest-payment-card-input guest-payment-card-input--number${fieldErrors.cardNumber ? ' guest-payment-card-input--error' : ''}`}
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              maxLength={cardNumberInputMaxLength(paymentMethodId, cardSecrets.cardNumber)}
              value={formatCardNumberDisplay(cardSecrets.cardNumber, paymentMethodId)}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              onFocus={flipToFront}
              aria-invalid={Boolean(fieldErrors.cardNumber)}
            />
          </div>

          <div className="guest-payment-card-field">
            <label className="guest-payment-card-label" htmlFor={`${sceneId}-name`}>
              {t('events.detail.guestMpPayment.cardholderName')}
            </label>
            <input
              id={`${sceneId}-name`}
              className={`guest-payment-card-input guest-payment-card-input--name${fieldErrors.cardholderName ? ' guest-payment-card-input--error' : ''}`}
              type="text"
              autoComplete="cc-name"
              placeholder={t('events.detail.guestMpPayment.cardholderName')}
              value={cardPayment.cardholderName}
              onChange={(e) => onCardChange({ cardholderName: e.target.value })}
              onFocus={flipToFront}
              aria-invalid={Boolean(fieldErrors.cardholderName)}
            />
          </div>
        </div>

        <div
          className={`guest-payment-card-face guest-payment-card-face--back${showBackError ? ' has-error' : ''}`}
        >
          <div className="guest-payment-card-strip" aria-hidden />

          <div className="guest-payment-card-back-row">
            <div className="guest-payment-card-back-field">
              <label className="guest-payment-card-label" htmlFor={`${sceneId}-expiry`}>
                {t('events.detail.guestMpPayment.cardExpiry')}
              </label>
              <input
                id={`${sceneId}-expiry`}
                className={`guest-payment-card-input guest-payment-card-input--expiry${fieldErrors.expirationMonth || fieldErrors.expirationYear ? ' guest-payment-card-input--error' : ''}`}
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={expiryDisplay}
                onChange={(e) => handleExpiryChange(e.target.value)}
                onFocus={flipToBack}
                aria-invalid={Boolean(
                  fieldErrors.expirationMonth || fieldErrors.expirationYear,
                )}
              />
            </div>

            <div className="guest-payment-card-back-field guest-payment-card-back-field--cvv">
              <label className="guest-payment-card-label" htmlFor={`${sceneId}-cvv`}>
                {t('events.detail.guestMpPayment.securityCode')}
              </label>
              <div className="guest-payment-card-cvv-box">
                <input
                  id={`${sceneId}-cvv`}
                  className={`guest-payment-card-input guest-payment-card-input--cvv${fieldErrors.securityCode ? ' guest-payment-card-input--error' : ''}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="CVV"
                  maxLength={4}
                  value={cardSecrets.securityCode}
                  onChange={(e) =>
                    onSecretsChange({
                      securityCode: e.target.value.replace(/\D/g, '').slice(0, 4),
                    })
                  }
                  onFocus={flipToBack}
                  aria-invalid={Boolean(fieldErrors.securityCode)}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <Button
        type="link"
        icon={<SwapOutlined />}
        className="guest-payment-card-flip-btn"
        onClick={toggleFlip}
        aria-pressed={flipped}
      >
        {flipped
          ? t('events.detail.guestMpPayment.cardFlipToFront')
          : t('events.detail.guestMpPayment.cardFlipToBack')}
      </Button>
    </div>
  )
}

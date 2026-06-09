import {
  CreditCardOutlined,
  GiftOutlined,
  IdcardOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Collapse, Flex, Modal, Spin, Tag, Typography, message } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, FieldDefinition, InvitationStatus, Product } from '@/shared/types/api'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import { useGuestGiftProducts } from '../gift/useGuestGiftProducts'
import { formatGuestGiftProductPrice } from '../gift/GuestGiftProductCard'
import { buildGuestFinishedPaymentLineItems } from '../../invitationFlow/lib/guestFinishedPayments'
import {
  fetchPaymentStatus,
  type GuestPaymentStatusResponse,
  type InvitationGuestView,
  type InvitationPaymentSummary,
} from '../../invitationFlow/lib/guestInvitationApi'
import { useInvitationPayments } from '../../invitationFlow/hooks/useInvitationPayments'
import {
  formatReviewFieldLine,
  formatReviewGuestHeading,
  type GuestConfirmFormSlot,
} from '../../invitationFlow/lib/guestConfirmMock'
import {
  guestPanelContentStyle,
  guestPanelShellClassName,
  guestPanelShellStyle,
} from '../../invitationFlow/shared/guestPanelLayout'
import { GuestEventScheduleDetails } from '../../invitationFlow/shared/GuestEventScheduleDetails'
import { GuestFinishedSection } from '../../invitationFlow/shared/GuestFinishedSection'
import { GuestWelcomeEmblem } from '../../invitationFlow/shared/GuestWelcomeEmblem'
import { isPendingPaymentStatus } from '../../invitationFlow/lib/resolveActivePendingPayment'
import './eventGuestFinished.css'

const { Text, Title, Paragraph } = Typography

type Props = {
  event: Event
  invitationId: string
  invitationAccess?: InvitationAccess | null
  guestView: InvitationGuestView | null
  fieldDefinitions?: FieldDefinition[]
  loading?: boolean
  onEditGuests?: () => void
  onEditGifts?: () => void
}

function toFormSlot(
  slot: InvitationGuestView['spots'][number],
): GuestConfirmFormSlot {
  return {
    slotId: slot.id,
    name: slot.name ?? '',
    hasPresetName: Boolean(slot.name?.trim()),
    fromInvitation: true,
    requiredFieldIds: slot.required_field_ids ?? [],
    fieldValues: slot.field_values ?? {},
    attending: slot.attending !== false,
  }
}

function isPixPayment(payment: InvitationPaymentSummary): boolean {
  return (payment.payment_method ?? '').toLowerCase() === 'pix'
}

function paymentStatusTagColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'PROCESSING':
      return 'processing'
    case 'FAILED':
      return 'error'
    case 'CANCELLED':
      return 'default'
    case 'REFUNDED':
      return 'purple'
    default:
      return 'default'
  }
}

function sortPaymentsDesc(payments: InvitationPaymentSummary[]): InvitationPaymentSummary[] {
  return [...payments].sort(
    (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
  )
}

function GuestFinishedHeartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      width="1em"
      height="1em"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

export function EventGuestFinishedBlock({
  event,
  invitationId,
  invitationAccess,
  guestView,
  fieldDefinitions = [],
  loading = false,
  onEditGuests,
  onEditGifts,
}: Props) {
  const { t, i18n } = useTranslation()
  const { data: payments = [], isLoading: paymentsLoading } = useInvitationPayments()
  const [pixModalOpen, setPixModalOpen] = useState(false)
  const [pixModalLoading, setPixModalLoading] = useState(false)
  const [pixModalPayment, setPixModalPayment] = useState<GuestPaymentStatusResponse | null>(null)
  const { products: giftProducts } = useGuestGiftProducts(event.id, invitationId)

  const invitation = guestView?.invitation
  const status = (invitation?.status ?? 'SENT') as InvitationStatus
  const isDeclined = status === 'DECLINED'

  const spotsForDisplay = useMemo(() => {
    if (!guestView) return []
    if (isDeclined) return guestView.spots
    return guestView.spots.filter((slot) => slot.attending !== false)
  }, [guestView, isDeclined])

  const gifts = guestView?.user_products.gifts ?? []

  const giftProductById = useMemo(() => {
    const map = new Map<string, Product>()
    for (const product of giftProducts) {
      map.set(product.id, product)
    }
    return map
  }, [giftProducts])

  const spotById = useMemo(() => {
    const map = new Map<string, InvitationGuestView['spots'][number]>()
    for (const slot of guestView?.spots ?? []) {
      map.set(slot.id, slot)
    }
    return map
  }, [guestView?.spots])

  const sortedPayments = useMemo(
    () => sortPaymentsDesc(payments.filter((payment) => payment.amount > 0)),
    [payments],
  )

  const formatPaymentStatus = (paymentStatus: string) => {
    const key = `events.detail.guestFinished.paymentStatus.${paymentStatus.toUpperCase()}`
    const translated = t(key)
    return translated === key ? paymentStatus : translated
  }

  const formatPaymentTotal = (payment: InvitationPaymentSummary) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: payment.currency || 'BRL',
    }).format(payment.amount / 100)

  const formatPaymentDate = (payment: InvitationPaymentSummary) => {
    const parsed = Date.parse(payment.created_at)
    if (Number.isNaN(parsed)) return null
    const locale = i18n.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(parsed))
  }

  const formatPaymentDateLabel = (payment: InvitationPaymentSummary) => {
    if (payment.amount <= 0) return null
    const date = formatPaymentDate(payment)
    if (!date) return null
    const status = payment.status.toUpperCase()
    if (status === 'APPROVED') {
      return t('events.detail.guestFinished.paymentDateApproved', { date })
    }
    if (status === 'PENDING' || status === 'PROCESSING') {
      return t('events.detail.guestFinished.paymentDatePending', { date })
    }
    return t('events.detail.guestFinished.paymentDateOther', { date })
  }

  const handleOpenPix = useCallback(
    async (paymentId: string) => {
      setPixModalOpen(true)
      setPixModalLoading(true)
      setPixModalPayment(null)
      try {
        const statusResponse = await fetchPaymentStatus(
          event.id,
          invitationId,
          paymentId,
          invitationAccess,
        )
        setPixModalPayment(statusResponse)
      } catch {
        message.error(t('events.detail.guestFinished.pixLoadError'))
        setPixModalOpen(false)
      } finally {
        setPixModalLoading(false)
      }
    },
    [event.id, invitationAccess, invitationId, t],
  )

  const handleCopyPix = async () => {
    const code = pixModalPayment?.pix?.copy_paste_code
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      message.success(t('events.detail.guestPayment.copyPixSuccess'))
    } catch {
      message.error(t('events.detail.guestPayment.copyPixError'))
    }
  }

  const paymentCollapseItems = useMemo(() => {
    return sortedPayments.map((payment, index) => {
      const orderItems = payment.items ?? []
      const lineItems = buildGuestFinishedPaymentLineItems(orderItems, {
        spotById,
        currency: payment.currency,
        t,
      })
      const showPixButton = isPendingPaymentStatus(payment.status) && isPixPayment(payment)
      const paymentDateLabel = formatPaymentDateLabel(payment)

      return {
        key: payment.id,
        label: (
          <div className="guest-finished-payment-header">
            <span className="guest-finished-payment-index">#{index + 1}</span>
            <div className="guest-finished-payment-main">
              <Tag
                bordered={false}
                color={paymentStatusTagColor(payment.status)}
                className="guest-finished-payment-status"
              >
                {formatPaymentStatus(payment.status)}
              </Tag>
              <span className="guest-finished-payment-item-count">
                {t('events.detail.guestFinished.paymentItemCount', { count: lineItems.length })}
              </span>
              {paymentDateLabel ? (
                <span className="guest-finished-payment-date">{paymentDateLabel}</span>
              ) : null}
            </div>
            {showPixButton ? (
              <Button
                size="small"
                onClick={(event) => {
                  event.stopPropagation()
                  void handleOpenPix(payment.id)
                }}
              >
                {t('events.detail.guestFinished.reopenPix')}
              </Button>
            ) : null}
            <span className="guest-finished-payment-total">{formatPaymentTotal(payment)}</span>
          </div>
        ),
        children:
          lineItems.length === 0 ? (
            <Text className="guest-finished-payment-items-empty">
              {t('events.detail.guestFinished.paymentItemsEmpty')}
            </Text>
          ) : (
            <ul className="guest-finished-payment-items">
              {lineItems.map((item) => (
                <li key={item.key} className="guest-finished-payment-item">
                  <span
                    className={`guest-finished-payment-item-icon guest-finished-payment-item-icon--${item.kind}`}
                    aria-hidden
                  >
                    {item.kind === 'ticket' ? <IdcardOutlined /> : <GiftOutlined />}
                  </span>
                  <div className="guest-finished-payment-item-text">
                    <span className="guest-finished-payment-item-title">{item.title}</span>
                    {item.subtitle ? (
                      <span className="guest-finished-payment-item-subtitle">{item.subtitle}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ),
      }
    })
  }, [handleOpenPix, i18n.language, spotById, sortedPayments, t])

  if (loading || !guestView) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
        <Spin size="large" />
      </Flex>
    )
  }

  return (
    <div className={`${guestPanelShellClassName} guest-finished-shell`} style={guestPanelShellStyle}>
      <Flex vertical align="center" gap={24} style={guestPanelContentStyle}>
        <GuestWelcomeEmblem />

        <Flex vertical align="center" gap={12} style={{ width: '100%' }}>
          <Title level={3} className="guest-finished-hero-title">
            {isDeclined
              ? t('events.detail.guestFinished.declinedTitle')
              : t('events.detail.guestFinished.title')}
          </Title>
          <Paragraph className="guest-finished-hero-subtitle">
            {isDeclined
              ? t('events.detail.guestFinished.declinedSubtitle')
              : t('events.detail.guestFinished.subtitle')}
          </Paragraph>
        </Flex>

        <div className="guest-finished-sections">
          <GuestFinishedSection
            id="guest-finished-event-heading"
            icon={<GuestFinishedHeartIcon />}
            title={event.name}
          >
            <GuestEventScheduleDetails event={event} />
          </GuestFinishedSection>

          <GuestFinishedSection
            id="guest-finished-guests-heading"
            icon={<TeamOutlined />}
            title={t('events.detail.guestFinished.guestsSection')}
            count={spotsForDisplay.length}
            editLabel={onEditGuests ? t('events.detail.guestFinished.sectionEdit') : undefined}
            onEdit={onEditGuests}
          >
            {spotsForDisplay.length === 0 ? (
              <Text className="guest-finished-empty">{t('events.detail.guestFinished.guestsEmpty')}</Text>
            ) : (
              spotsForDisplay.map((slot, index) => {
                const formSlot = toFormSlot(slot)
                return (
                  <div key={slot.id} className="guest-finished-guest-block">
                    <Text className="guest-finished-guest-name">
                      {formatReviewGuestHeading(formSlot, index + 1, t)}
                    </Text>
                    {formSlot.requiredFieldIds.map((fieldId) => (
                      <Text key={fieldId} className="guest-finished-guest-field">
                        {formatReviewFieldLine(fieldId, formSlot, fieldDefinitions, t)}
                      </Text>
                    ))}
                    {!slot.user_product ? (
                      <Text className="guest-finished-guest-field">
                        {t('events.detail.guestFinished.ticketPending')}
                      </Text>
                    ) : null}
                  </div>
                )
              })
            )}
          </GuestFinishedSection>

          <GuestFinishedSection
            id="guest-finished-gifts-heading"
            icon={<GiftOutlined />}
            title={t('events.detail.guestFinished.giftsSection')}
            count={gifts.length}
            editLabel={onEditGifts ? t('events.detail.guestFinished.sectionEdit') : undefined}
            onEdit={onEditGifts}
          >
            {gifts.length === 0 ? (
              <Text className="guest-finished-empty">{t('events.detail.guestFinished.giftsEmpty')}</Text>
            ) : (
              gifts.map((gift) => {
                const product = giftProductById.get(gift.product_id)
                const imageSrc = product?.imageURL?.trim()
                const name =
                  product?.name ??
                  (typeof gift.metadata?.display_name === 'string'
                    ? gift.metadata.display_name
                    : gift.product_id)
                const priceLabel = product
                  ? formatGuestGiftProductPrice(product, t('events.detail.guestGift.free'))
                  : t('events.detail.guestFinished.giftPriceUnavailable')

                return (
                  <div key={gift.id} className="guest-finished-gift-row">
                    <div className="guest-finished-gift-media">
                      {imageSrc ? (
                        <img src={imageSrc} alt="" />
                      ) : (
                        <GiftOutlined aria-hidden />
                      )}
                    </div>
                    <div className="guest-finished-gift-details">
                      <span className="guest-finished-gift-name">{name}</span>
                      <span className="guest-finished-gift-price">{priceLabel}</span>
                    </div>
                  </div>
                )
              })
            )}
          </GuestFinishedSection>

          <GuestFinishedSection
            id="guest-finished-payments-heading"
            icon={<CreditCardOutlined />}
            title={t('events.detail.guestFinished.paymentsSection')}
            count={sortedPayments.length}
          >
            {paymentsLoading ? (
              <Spin size="small" />
            ) : sortedPayments.length === 0 ? (
              <Text className="guest-finished-empty">{t('events.detail.guestFinished.paymentsEmpty')}</Text>
            ) : (
              <Collapse
                bordered={false}
                className="guest-finished-payment-collapse"
                items={paymentCollapseItems}
              />
            )}
          </GuestFinishedSection>
        </div>
      </Flex>

      <Modal
        open={pixModalOpen}
        title={t('events.detail.guestFinished.pixModalTitle')}
        onCancel={() => {
          setPixModalOpen(false)
          setPixModalPayment(null)
        }}
        footer={[
          <Button key="close" onClick={() => setPixModalOpen(false)}>
            {t('events.detail.guestFinished.pixModalClose')}
          </Button>,
          pixModalPayment?.pix?.copy_paste_code ? (
            <Button key="copy" type="primary" onClick={() => void handleCopyPix()}>
              {t('events.detail.guestPayment.copyPix')}
            </Button>
          ) : null,
        ]}
      >
        {pixModalLoading ? (
          <Flex justify="center" style={{ padding: 24 }}>
            <Spin />
          </Flex>
        ) : pixModalPayment?.pix?.qr_code_base64 ? (
          <div className="guest-finished-pix-modal-qr">
            <img
              src={`data:image/png;base64,${pixModalPayment.pix.qr_code_base64}`}
              alt=""
            />
          </div>
        ) : null}
        {pixModalPayment?.pix?.copy_paste_code ? (
          <Text copyable={{ text: pixModalPayment.pix.copy_paste_code }}>
            {pixModalPayment.pix.copy_paste_code}
          </Text>
        ) : null}
      </Modal>
    </div>
  )
}

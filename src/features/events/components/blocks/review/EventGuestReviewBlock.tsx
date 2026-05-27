import {
  CalendarOutlined,
  CarryOutOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  LinkOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Flex, Modal, Spin, Tooltip, Typography, message } from 'antd'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, FieldDefinition, Product } from '@/shared/types/api'
import { schedulesFromEvent } from '@/features/events/scheduleList'
import {
  giftCheckoutLineItems,
  giftCheckoutTotalCents,
  type GuestCheckoutLineItem,
  type GuestCheckoutSnapshot,
} from '../../invitationFlow/lib/guestCheckoutSession'
import {
  allGuestsNotAttending,
  formatReviewFieldLine,
  formatReviewGuestHeading,
  type GuestConfirmFormSlot,
} from '../../invitationFlow/lib/guestConfirmMock'
import { scheduleEventStart } from '../../invitationFlow/lib/scheduleEventZoned'
import { GuestFlowActions } from '../../invitationFlow/shared/GuestFlowActions'
import { GuestFlowBlockHeader } from '../../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestGiftProductCard } from '../gift/GuestGiftProductCard'
import { GuestGiftSummaryBar } from '../gift/GuestGiftSummaryBar'
import { GuestReviewSection } from './GuestReviewSection'
import { GuestPaymentReviewSection } from '../payment/GuestPaymentReviewSection'
import type { GuestCardPaymentPersisted } from '../mpPayment/guestMpPaymentDraft'
import type { GuestPaymentSnapshot } from '../payment/types'
import { useGuestGiftProducts } from '../gift/useGuestGiftProducts'
import { guestPanelContentStyle, guestPanelShellClassName, guestPanelShellStyle } from '../../invitationFlow/shared/guestPanelLayout'
import type { EventGuestReviewVariant } from '../../invitationFlow/types'
import '../gift/eventGuestGift.css'
import './eventGuestReview.css'

const { Text, Paragraph } = Typography

type Props = {
  event: Event
  invitationId: string
  variant: EventGuestReviewVariant
  guestSlots: GuestConfirmFormSlot[]
  checkout: GuestCheckoutSnapshot | null
  paymentSnapshot: GuestPaymentSnapshot | null
  cardPayment: GuestCardPaymentPersisted
  coupleMessage: string
  fieldDefinitions: FieldDefinition[]
  onEdit: () => void
  onEditGuests: () => void
  onEditGifts: () => void
  onEditPayment?: () => void
  onEditMessage: () => void
  onConfirm: () => void
}

function ReviewDetailLabel({
  icon,
  inlineActions,
  children,
}: {
  icon?: ReactNode
  inlineActions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="guest-review-detail-label">
      <Text type="secondary" className="guest-review-detail-label-text">
        {children}
      </Text>
      {icon ? (
        <span className="guest-review-detail-label-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      {inlineActions}
    </div>
  )
}

function formatScheduleLine(
  lang: string,
  sched: { timezone: string },
  start: ReturnType<typeof scheduleEventStart>,
): string | null {
  if (!start?.isValid()) return null
  const locale = lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US'
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: sched.timezone.trim(),
    }).format(start.toDate())
  } catch {
    return start.format('MMMM D, YYYY h:mm A')
  }
}

function EventInfoSection({ event, hideDetails }: { event: Event; hideDetails?: boolean }) {
  const { t, i18n } = useTranslation()
  const [externalLinkModalOpen, setExternalLinkModalOpen] = useState(false)
  const schedules = useMemo(() => schedulesFromEvent(event), [event])
  const primarySchedule = schedules[0]
  const startZoned = useMemo(() => scheduleEventStart(primarySchedule), [primarySchedule])
  const whenLine = useMemo(() => {
    if (!primarySchedule || !startZoned?.isValid()) return null
    return formatScheduleLine(i18n.language, primarySchedule, startZoned)
  }, [i18n.language, primarySchedule, startZoned])

  const venueLine =
    !event.is_online && event.location
      ? [event.location.venue_name, event.location.formatted_address].filter(Boolean).join(' · ') || null
      : null

  const mapsUrl =
    !event.is_online && event.location?.maps_url?.trim()
      ? event.location.maps_url.trim()
      : null

  const onlineUrl = event.is_online
    ? event.location?.website_url?.trim() || event.location?.maps_url?.trim() || null
    : null

  const whereCopyText = useMemo(() => {
    if (onlineUrl) return onlineUrl
    if (mapsUrl) return mapsUrl
    if (venueLine) return venueLine
    if (event.is_online) return t('events.detail.guestWelcome.detailsOnline')
    return null
  }, [event.is_online, mapsUrl, onlineUrl, t, venueLine])

  const handleCopyWhere = useCallback(async () => {
    if (!whereCopyText) return
    try {
      await navigator.clipboard.writeText(whereCopyText)
      message.success(t('events.detail.guestReview.copyWhereSuccess'))
    } catch {
      message.error(t('events.detail.guestReview.copyWhereError'))
    }
  }, [t, whereCopyText])

  const whereExternalUrl = onlineUrl ?? mapsUrl

  const handleConfirmExternalLink = useCallback(() => {
    if (whereExternalUrl) {
      window.open(whereExternalUrl, '_blank', 'noopener,noreferrer')
    }
    setExternalLinkModalOpen(false)
  }, [whereExternalUrl])

  const whereLabelInlineActions =
    whereCopyText || whereExternalUrl ? (
      <div className="guest-review-where-label-actions">
        {whereCopyText ? (
          <Tooltip title={t('events.detail.guestReview.copyWhere')} placement="top">
            <Button
              type="text"
              size="small"
              className="guest-review-where-label-action"
              icon={<CopyOutlined />}
              aria-label={t('events.detail.guestReview.copyWhere')}
              onClick={() => void handleCopyWhere()}
            />
          </Tooltip>
        ) : null}
        {whereExternalUrl ? (
          <Tooltip title={t('events.detail.mapsLink')} placement="top">
            <Button
              type="text"
              size="small"
              className="guest-review-where-label-action"
              icon={<LinkOutlined />}
              aria-label={`${t('events.detail.guestWelcome.detailsWhere')}: ${whereCopyText ?? ''}. ${t('events.detail.mapsLink')}`}
              onClick={() => setExternalLinkModalOpen(true)}
            />
          </Tooltip>
        ) : null}
      </div>
    ) : undefined

  let whereContent: ReactNode
  if (event.is_online) {
    whereContent = (
      <Text style={{ fontSize: 16 }}>{t('events.detail.guestWelcome.detailsOnline')}</Text>
    )
  } else if (venueLine) {
    whereContent = <Text style={{ fontSize: 16 }}>{venueLine}</Text>
  } else {
    whereContent = (
      <Text type="secondary">{t('events.detail.guestWelcome.detailsWhereTbd')}</Text>
    )
  }

  return (
    <GuestReviewSection
      id="guest-review-event-heading"
      icon={<CalendarOutlined />}
      title={event.name}
      hideDivider={hideDetails}
    >
      {hideDetails ? null : (
        <>
          <div>
            <ReviewDetailLabel icon={<CarryOutOutlined />}>
              {t('events.detail.guestWelcome.detailsWhen')}
            </ReviewDetailLabel>
            {whenLine ? (
              <Text style={{ fontSize: 16 }}>{whenLine}</Text>
            ) : (
              <Text type="secondary">{t('events.detail.guestWelcome.detailsWhenTbd')}</Text>
            )}
          </div>
          <div>
            <ReviewDetailLabel
              icon={<EnvironmentOutlined />}
              inlineActions={whereLabelInlineActions}
            >
              {t('events.detail.guestWelcome.detailsWhere')}
            </ReviewDetailLabel>
            {whereContent}
          </div>

          <Modal
            open={externalLinkModalOpen}
            title={t('events.detail.guestReview.externalLinkModalTitle')}
            okText={t('events.detail.guestReview.externalLinkModalOk')}
            cancelText={t('events.detail.guestReview.externalLinkModalCancel')}
            onOk={handleConfirmExternalLink}
            onCancel={() => setExternalLinkModalOpen(false)}
            destroyOnClose
          >
            <Paragraph style={{ marginBottom: whereExternalUrl ? 12 : 0 }}>
              {t('events.detail.guestReview.externalLinkModalBody')}
            </Paragraph>
            {whereExternalUrl ? (
              <Text type="secondary" className="guest-review-external-link-url">
                {whereExternalUrl}
              </Text>
            ) : null}
          </Modal>
        </>
      )}
    </GuestReviewSection>
  )
}

function GuestsSection({
  slots,
  fieldDefinitions,
  editLabel,
  onEdit,
  everyoneDeclined,
}: {
  slots: GuestConfirmFormSlot[]
  fieldDefinitions: FieldDefinition[]
  editLabel: string
  onEdit: () => void
  everyoneDeclined: boolean
}) {
  const { t } = useTranslation()

  return (
    <GuestReviewSection
      id="guest-review-guests-heading"
      icon={<TeamOutlined />}
      title={t('events.detail.guestReview.sectionGuests')}
      editLabel={editLabel}
      onEdit={onEdit}
      titleExtra={
        <Text type="secondary" className="guest-review-section-count">
          {everyoneDeclined
            ? t('events.detail.guestReview.allDeclinedGuestBadge', { count: slots.length })
            : t('events.detail.guestReview.guestCount', { count: slots.length })}
        </Text>
      }
    >
      {slots.length === 0 ? (
        <Text type="secondary">{t('events.detail.guestReview.guestsEmpty')}</Text>
      ) : everyoneDeclined ? (
        <div className="guest-review-decline-notice">
          <Paragraph style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
            {t('events.detail.guestReview.allDeclinedGuestsSummary')}
          </Paragraph>
        </div>
      ) : (
        slots.map((slot, index) => (
          <div key={index} className="guest-review-guest-block">
            <Flex vertical gap={8}>
              <Text strong style={{ fontSize: 16 }}>
                {formatReviewGuestHeading(slot, index + 1, t)}
              </Text>
              {slot.attending === false ? null : slot.requiredFieldIds.length === 0 ? (
                <Text type="secondary">{t('events.detail.guestConfirm.reviewNoFields')}</Text>
              ) : (
                slot.requiredFieldIds.map((fieldId) => (
                  <Text key={fieldId} style={{ fontSize: 16 }}>
                    {formatReviewFieldLine(fieldId, slot, fieldDefinitions, t)}
                  </Text>
                ))
              )}
            </Flex>
          </div>
        ))
      )}
    </GuestReviewSection>
  )
}

function productFromCheckoutLine(item: GuestCheckoutLineItem, catalog?: Product): Product {
  if (catalog) return catalog
  return {
    id: item.product_id,
    name: item.name,
    description: '',
    user_id: '',
    is_free: item.total_price_cents === 0,
    value: item.unit_price_cents,
    quantity: item.quantity,
    max_per_user: 1,
    active: true,
    created_at: '',
    updated_at: '',
    created_by: '',
    last_updated_by: '',
  }
}

function resolveCheckoutProducts(
  lineItems: GuestCheckoutSnapshot['items'],
  products: Product[],
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]))
  return lineItems.map((item) => productFromCheckoutLine(item, byId.get(item.product_id)))
}

function GiftsSection({
  invitationId,
  checkout,
  editLabel,
  onEdit,
}: {
  invitationId: string
  checkout: GuestCheckoutSnapshot | null
  editLabel: string
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const { products, isLoading } = useGuestGiftProducts(invitationId)
  const freeLabel = t('events.detail.guestGift.free')

  const giftLineItems = useMemo(
    () => (checkout ? giftCheckoutLineItems(checkout) : []),
    [checkout],
  )

  const selectedProducts = useMemo(() => {
    if (giftLineItems.length === 0) return []
    return resolveCheckoutProducts(giftLineItems, products)
  }, [giftLineItems, products])

  const giftTotalCents = useMemo(
    () => (checkout ? giftCheckoutTotalCents(checkout) : 0),
    [checkout],
  )

  if (!checkout || giftLineItems.length === 0) {
    return (
      <GuestReviewSection
        id="guest-review-gifts-heading"
        icon={<GiftOutlined />}
        title={t('events.detail.guestReview.sectionGifts')}
        editLabel={editLabel}
        onEdit={onEdit}
      >
        <Text type="secondary">{t('events.detail.guestReview.giftsEmpty')}</Text>
      </GuestReviewSection>
    )
  }

  return (
    <GuestReviewSection
      id="guest-review-gifts-heading"
      icon={<GiftOutlined />}
      title={t('events.detail.guestReview.sectionGifts')}
      editLabel={editLabel}
      onEdit={onEdit}
    >
      {isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 120, width: '100%' }}>
          <Spin />
        </Flex>
      ) : (
        <>
          <div className="guest-gift-list">
            {selectedProducts.map((product) => (
              <GuestGiftProductCard
                key={product.id}
                product={product}
                freeLabel={freeLabel}
                selected
              />
            ))}
          </div>
          <GuestGiftSummaryBar
            selectedCount={selectedProducts.length}
            totalCents={giftTotalCents}
          />
        </>
      )}
    </GuestReviewSection>
  )
}

function MessageSection({
  message,
  editLabel,
  onEdit,
}: {
  message: string
  editLabel: string
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const trimmed = message.trim()

  return (
    <GuestReviewSection
      id="guest-review-message-heading"
      icon={<MessageOutlined />}
      title={t('events.detail.guestReview.sectionMessage')}
      editLabel={editLabel}
      onEdit={onEdit}
    >
      {trimmed ? (
        <Paragraph style={{ margin: 0, fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {trimmed}
        </Paragraph>
      ) : (
        <Text type="secondary" style={{ fontSize: 16, lineHeight: 1.6 }}>
          {t('events.detail.guestReview.messageEmpty')}
        </Text>
      )}
    </GuestReviewSection>
  )
}

export function EventGuestReviewBlock({
  event,
  invitationId,
  variant,
  guestSlots,
  checkout,
  paymentSnapshot,
  cardPayment,
  coupleMessage,
  fieldDefinitions,
  onEdit,
  onEditGuests,
  onEditGifts,
  onEditPayment,
  onEditMessage,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  const sectionEditLabel = t('events.detail.guestReview.sectionEdit')
  const showPaymentEdit = Boolean(onEditPayment)
  const everyoneDeclined = guestSlots.length > 0 && allGuestsNotAttending(guestSlots)
  const hasSelectedGifts = Boolean(checkout && giftCheckoutLineItems(checkout).length > 0)

  if (variant !== 'wedding') return null

  return (
    <div
      className={
        everyoneDeclined
          ? `${guestPanelShellClassName} guest-review-shell--all-declined`
          : guestPanelShellClassName
      }
      style={guestPanelShellStyle}
    >
      <Flex vertical align="center" gap={24} style={guestPanelContentStyle}>
        <GuestFlowBlockHeader
          icon={<CheckCircleOutlined />}
          title={
            everyoneDeclined
              ? t('events.detail.guestConfirm.reviewAllDeclinedTitle')
              : t('events.detail.guestReview.title')
          }
          subtitle={
            everyoneDeclined
              ? t('events.detail.guestReview.allDeclinedFinalSubtitle')
              : t('events.detail.guestReview.subtitle')
          }
        />

        <EventInfoSection event={event} hideDetails={everyoneDeclined} />
        <GuestsSection
          slots={guestSlots}
          fieldDefinitions={fieldDefinitions}
          editLabel={sectionEditLabel}
          onEdit={onEditGuests}
          everyoneDeclined={everyoneDeclined}
        />
        <GiftsSection
          invitationId={invitationId}
          checkout={checkout}
          editLabel={sectionEditLabel}
          onEdit={onEditGifts}
        />
        {hasSelectedGifts ? (
          <GuestPaymentReviewSection
            checkout={checkout}
            paymentSnapshot={paymentSnapshot}
            cardPayment={cardPayment}
            editLabel={showPaymentEdit ? sectionEditLabel : undefined}
            onEdit={showPaymentEdit ? onEditPayment : undefined}
          />
        ) : null}
        <MessageSection
          message={coupleMessage}
          editLabel={sectionEditLabel}
          onEdit={onEditMessage}
        />

        <GuestFlowActions>
          <Button size="large" onClick={onEdit}>
            {t('events.detail.guestReview.edit')}
          </Button>
          <Button type="primary" size="large" onClick={onConfirm}>
            {t('events.detail.guestReview.confirm')}
          </Button>
        </GuestFlowActions>
      </Flex>
    </div>
  )
}

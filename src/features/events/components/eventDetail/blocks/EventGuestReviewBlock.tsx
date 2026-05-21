import { CheckCircleOutlined } from '@ant-design/icons'
import { Button, Card, Flex, Spin, Typography } from 'antd'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, FieldDefinition, Invitation } from '@/shared/types/api'
import { useEventSchedules } from '@/features/events/hooks'
import type { GuestCheckoutSnapshot } from '../guestCheckoutSession'
import {
  formatReviewFieldLine,
  formatReviewGuestHeading,
  type GuestConfirmFormSlot,
} from '../guestConfirmMock'
import type { GuestMpPaymentSnapshot } from '../guestMpPaymentDraft'
import { scheduleEventStart } from '../scheduleEventZoned'
import { GuestFlowActions } from '../GuestFlowActions'
import { GuestFlowBlockHeader } from '../GuestFlowBlockHeader'
import { guestPanelContentStyle, guestPanelShellClassName, guestPanelShellStyle } from '../guestPanelLayout'
import type { EventGuestReviewVariant } from '../types'
import '../eventGuestReview.css'

const { Title, Text, Paragraph } = Typography

const priceFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

type Props = {
  event: Event
  variant: EventGuestReviewVariant
  invitation: Invitation | null
  guestSlots: GuestConfirmFormSlot[]
  checkout: GuestCheckoutSnapshot | null
  mpPaymentSnapshot: GuestMpPaymentSnapshot | null
  coupleMessage: string
  fieldDefinitions: FieldDefinition[]
  onEdit: () => void
  onConfirm: () => void
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

function EventInfoSection({ event }: { event: Event }) {
  const { t, i18n } = useTranslation()
  const { data: schedules = [], isLoading: schedulesLoading } = useEventSchedules(event.id)
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

  return (
    <section className="guest-review-section" aria-labelledby="guest-review-event-heading">
      <Title level={5} id="guest-review-event-heading" className="guest-review-section-title">
        {t('events.detail.guestReview.sectionEvent')}
      </Title>
      <Card size="small">
        <Flex vertical gap={12}>
          <div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              {t('events.detail.guestReview.eventName')}
            </Text>
            <Text style={{ fontSize: 17 }}>{event.name}</Text>
          </div>
          {event.description?.trim() ? (
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                {t('events.detail.guestReview.eventDescription')}
              </Text>
              <Paragraph style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
                {event.description.trim()}
              </Paragraph>
            </div>
          ) : null}
          <div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              {t('events.detail.guestWelcome.detailsWhen')}
            </Text>
            {schedulesLoading ? (
              <Spin size="small" />
            ) : whenLine ? (
              <Text style={{ fontSize: 16 }}>{whenLine}</Text>
            ) : (
              <Text type="secondary">{t('events.detail.guestWelcome.detailsWhenTbd')}</Text>
            )}
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              {t('events.detail.guestWelcome.detailsWhere')}
            </Text>
            {event.is_online ? (
              <Text style={{ fontSize: 16 }}>{t('events.detail.guestWelcome.detailsOnline')}</Text>
            ) : venueLine ? (
              <Text style={{ fontSize: 16 }}>{venueLine}</Text>
            ) : (
              <Text type="secondary">{t('events.detail.guestWelcome.detailsWhereTbd')}</Text>
            )}
          </div>
        </Flex>
      </Card>
    </section>
  )
}

function GuestsSection({
  slots,
  fieldDefinitions,
}: {
  slots: GuestConfirmFormSlot[]
  fieldDefinitions: FieldDefinition[]
}) {
  const { t } = useTranslation()

  return (
    <section className="guest-review-section" aria-labelledby="guest-review-guests-heading">
      <Title level={5} id="guest-review-guests-heading" className="guest-review-section-title">
        {t('events.detail.guestReview.sectionGuests')}
      </Title>
      {slots.length === 0 ? (
        <Card size="small">
          <Text type="secondary">{t('events.detail.guestReview.guestsEmpty')}</Text>
        </Card>
      ) : (
        slots.map((slot, index) => (
          <Card key={index} size="small" className="guest-review-guest-card">
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
          </Card>
        ))
      )}
    </section>
  )
}

function GiftsSection({ checkout }: { checkout: GuestCheckoutSnapshot | null }) {
  const { t } = useTranslation()

  if (!checkout || checkout.lineItems.length === 0) {
    return (
      <section className="guest-review-section" aria-labelledby="guest-review-gifts-heading">
        <Title level={5} id="guest-review-gifts-heading" className="guest-review-section-title">
          {t('events.detail.guestReview.sectionGifts')}
        </Title>
        <Card size="small">
          <Text type="secondary">{t('events.detail.guestReview.giftsEmpty')}</Text>
        </Card>
      </section>
    )
  }

  return (
    <section className="guest-review-section" aria-labelledby="guest-review-gifts-heading">
      <Title level={5} id="guest-review-gifts-heading" className="guest-review-section-title">
        {t('events.detail.guestReview.sectionGifts')}
      </Title>
      <Card size="small">
        <Flex vertical gap={4}>
          {checkout.lineItems.map((item) => (
            <div key={item.productId} className="guest-review-row">
              <Text>{item.name}</Text>
              <Text>{priceFormatter.format(item.totalPriceCents / 100)}</Text>
            </div>
          ))}
          <div className="guest-review-row" style={{ paddingTop: 8, borderTop: '1px solid var(--ant-color-border-secondary)' }}>
            <Text strong>{t('events.detail.guestGift.total')}</Text>
            <Text strong>{priceFormatter.format(checkout.totalCents / 100)}</Text>
          </div>
        </Flex>
      </Card>
    </section>
  )
}

function MessageSection({ message }: { message: string }) {
  const { t } = useTranslation()
  const trimmed = message.trim()

  return (
    <section className="guest-review-section" aria-labelledby="guest-review-message-heading">
      <Title level={5} id="guest-review-message-heading" className="guest-review-section-title">
        {t('events.detail.guestReview.sectionMessage')}
      </Title>
      <Card size="small">
        {trimmed ? (
          <Paragraph style={{ margin: 0, fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {trimmed}
          </Paragraph>
        ) : (
          <Text type="secondary" style={{ fontSize: 16, lineHeight: 1.6 }}>
            {t('events.detail.guestReview.messageEmpty')}
          </Text>
        )}
      </Card>
    </section>
  )
}

function PaymentSection({
  checkout,
  mpPaymentSnapshot,
}: {
  checkout: GuestCheckoutSnapshot | null
  mpPaymentSnapshot: GuestMpPaymentSnapshot | null
}) {
  const { t } = useTranslation()
  const totalCents = checkout?.totalCents ?? 0

  let body: ReactNode
  if (totalCents <= 0) {
    body = <Text type="secondary">{t('events.detail.guestReview.paymentNotRequired')}</Text>
  } else if (!mpPaymentSnapshot) {
    body = <Text type="secondary">{t('events.detail.guestReview.paymentPending')}</Text>
  } else if (mpPaymentSnapshot.method === 'pix') {
    body = (
      <Flex vertical gap={8}>
        <Text>{t('events.detail.guestMpPayment.methodPix')}</Text>
        <Flex vertical gap={2}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('events.detail.guestMpPayment.payerEmail')}
          </Text>
          <Text style={{ fontSize: 16 }}>{mpPaymentSnapshot.payer.email}</Text>
        </Flex>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {t('events.detail.guestReview.paymentPixNote')}
        </Text>
      </Flex>
    )
  } else {
    const card = mpPaymentSnapshot.card
    body = (
      <Flex vertical gap={8}>
        <Text>{t('events.detail.guestMpPayment.methodCard')}</Text>
        <Text style={{ fontSize: 16 }}>{card.cardholderName}</Text>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {t('events.detail.guestReview.paymentCardNote')}
        </Text>
        <Flex vertical gap={2}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('events.detail.guestMpPayment.payerEmail')}
          </Text>
          <Text style={{ fontSize: 16 }}>{card.payerEmail}</Text>
        </Flex>
        <Text style={{ fontSize: 15 }}>
          {t('events.detail.guestReview.paymentCardInstallments', {
            count: card.installments,
          })}
        </Text>
      </Flex>
    )
  }

  return (
    <section className="guest-review-section" aria-labelledby="guest-review-payment-heading">
      <Title level={5} id="guest-review-payment-heading" className="guest-review-section-title">
        {t('events.detail.guestReview.sectionPayment')}
      </Title>
      <Card size="small">{body}</Card>
    </section>
  )
}

export function EventGuestReviewBlock({
  event,
  variant,
  invitation,
  guestSlots,
  checkout,
  mpPaymentSnapshot,
  coupleMessage,
  fieldDefinitions,
  onEdit,
  onConfirm,
}: Props) {
  const { t } = useTranslation()

  if (variant !== 'wedding') return null

  return (
    <div className={guestPanelShellClassName} style={guestPanelShellStyle}>
      <Flex vertical align="center" gap={24} style={guestPanelContentStyle}>
        <GuestFlowBlockHeader
          icon={<CheckCircleOutlined />}
          title={t('events.detail.guestReview.title')}
          subtitle={t('events.detail.guestReview.subtitle')}
        />

        <EventInfoSection event={event} />
        {invitation?.name?.trim() ? (
          <section className="guest-review-section">
            <Title level={5} className="guest-review-section-title">
              {t('events.detail.guestReview.sectionInvitation')}
            </Title>
            <Card size="small">
              <Text style={{ fontSize: 16 }}>{invitation.name.trim()}</Text>
            </Card>
          </section>
        ) : null}
        <GuestsSection slots={guestSlots} fieldDefinitions={fieldDefinitions} />
        <GiftsSection checkout={checkout} />
        <PaymentSection checkout={checkout} mpPaymentSnapshot={mpPaymentSnapshot} />
        <MessageSection message={coupleMessage} />

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

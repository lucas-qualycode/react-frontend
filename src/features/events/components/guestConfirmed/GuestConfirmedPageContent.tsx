import { CheckCircleOutlined, CreditCardOutlined, MessageOutlined, TeamOutlined } from '@ant-design/icons'
import { Flex, Spin, Typography } from 'antd'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, FieldDefinition } from '@/shared/types/api'
import type { InvitationConfirmationResponse } from '../blocks/payment/checkoutPayload'
import type { GuestInvitationLoaderData } from '../../loaders/guestInvitationRoutes'
import { GuestFlowBlockHeader } from '../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestReviewSection } from '../blocks/review/GuestReviewSection'
import {
  formatReviewFieldLine,
  formatReviewGuestHeading,
  type GuestConfirmFormSlot,
} from '../invitationFlow/lib/guestConfirmMock'
import { clearGuestFlowDraft } from '../invitationFlow/lib/guestFlowDraftStorage'
import { guestPanelContentStyle, guestPanelShellClassName, guestPanelShellStyle } from '../invitationFlow/shared/guestPanelLayout'

const { Text } = Typography

type Props = {
  event: Event
  loaderData: GuestInvitationLoaderData
  confirmation: InvitationConfirmationResponse | null
  loading: boolean
  fieldDefinitions?: FieldDefinition[]
}

function mapGuestSlots(raw: Array<Record<string, unknown>>): GuestConfirmFormSlot[] {
  return raw.map((slot, index) => ({
    slotId: String(slot.id ?? slot.slotId ?? index),
    firstName: String(slot.first_name ?? slot.firstName ?? ''),
    hasPresetName: Boolean(slot.has_preset_name ?? slot.hasPresetName),
    fromInvitation: Boolean(slot.from_invitation ?? slot.fromInvitation ?? true),
    requiredFieldIds: Array.isArray(slot.required_field_ids)
      ? (slot.required_field_ids as string[])
      : [],
    fieldValues: (slot.field_values ?? slot.fieldValues ?? {}) as Record<string, string>,
    attending: slot.attending !== false,
  }))
}

function PaymentConfirmationSection({
  confirmation,
}: {
  confirmation: InvitationConfirmationResponse
}) {
  const { t } = useTranslation()
  const payment = confirmation.payments[0]
  if (!payment) return null

  const amount = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: payment.currency || 'BRL',
  }).format(payment.amount / 100)

  return (
    <GuestReviewSection
      id="guest-confirmed-payment-heading"
      icon={<CreditCardOutlined />}
      title={t('events.detail.guestConfirmed.paymentSection')}
    >
      <Flex vertical gap={8}>
        <Text>
          <Text strong>{t('events.detail.guestConfirmed.status')}:</Text>{' '}
          {payment.status}
        </Text>
        {payment.payment_method ? (
          <Text>
            <Text strong>{t('events.detail.guestConfirmed.method')}:</Text>{' '}
            {payment.payment_method}
          </Text>
        ) : null}
        <Text>
          <Text strong>{t('events.detail.guestConfirmed.totalPaid')}:</Text> {amount}
        </Text>
        {payment.payment_provider_payment_id ? (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('events.detail.guestConfirmed.reference')}: {payment.payment_provider_payment_id}
          </Text>
        ) : null}
      </Flex>
    </GuestReviewSection>
  )
}

export function GuestConfirmedPageContent({
  event,
  loaderData,
  confirmation,
  loading,
  fieldDefinitions = [],
}: Props) {
  const { t } = useTranslation()
  const { invitationId } = loaderData

  useEffect(() => {
    clearGuestFlowDraft(invitationId)
  }, [invitationId])

  const guestSlots = useMemo(
    () => (confirmation ? mapGuestSlots(confirmation.guest_slots) : []),
    [confirmation],
  )

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 260, width: '100%' }}>
        <Spin size="large" />
      </Flex>
    )
  }

  return (
    <div className={guestPanelShellClassName} style={guestPanelShellStyle}>
      <Flex vertical align="center" gap={24} style={guestPanelContentStyle}>
        <GuestFlowBlockHeader
          icon={<CheckCircleOutlined />}
          title={t('events.detail.guestConfirmed.title')}
          subtitle={t('events.detail.guestConfirmed.subtitle')}
        />

        {guestSlots.length > 0 ? (
          <GuestReviewSection
            id="guest-confirmed-guests-heading"
            icon={<TeamOutlined />}
            title={t('events.detail.guestReview.sectionGuests')}
          >
            <Flex vertical gap={12}>
              {guestSlots.map((slot, index) => (
                <div key={slot.slotId ?? index}>
                  <Text strong>{formatReviewGuestHeading(slot, index + 1, t)}</Text>
                  {slot.requiredFieldIds.map((fieldId) => (
                    <div key={fieldId}>
                      <Text>{formatReviewFieldLine(fieldId, slot, fieldDefinitions, t)}</Text>
                    </div>
                  ))}
                </div>
              ))}
            </Flex>
          </GuestReviewSection>
        ) : null}

        {confirmation?.couple_message ? (
          <GuestReviewSection
            id="guest-confirmed-message-heading"
            icon={<MessageOutlined />}
            title={t('events.detail.guestReview.sectionMessage')}
          >
            <Text style={{ fontSize: 16, lineHeight: 1.6 }}>{confirmation.couple_message}</Text>
          </GuestReviewSection>
        ) : null}

        {confirmation ? <PaymentConfirmationSection confirmation={confirmation} /> : null}

        <Text type="secondary">{event.name}</Text>
      </Flex>
    </div>
  )
}

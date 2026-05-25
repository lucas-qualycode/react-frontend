import { LeftOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Flex, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, FieldDefinition, Invitation, Product } from '@/shared/types/api'
import type { GuestConfirmPhase } from '../../invitationFlow/lib/guestFlowDraft'
import {
  fieldLabelById,
  formatReviewFieldLine,
  formatReviewGuestHeading,
  showGuestConfirmValidationMessage,
  validateGuestSlot,
  type GuestConfirmFormSlot,
  type GuestSlotValidationResult,
} from '../../invitationFlow/lib/guestConfirmMock'
import { GuestConfirmBorderField } from './GuestConfirmBorderField'
import { GuestFlowActions } from '../../invitationFlow/shared/GuestFlowActions'
import { GuestFlowBlockHeader } from '../../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestFlowContentPanel } from '../../invitationFlow/shared/GuestFlowContentPanel'
import type { EventGuestConfirmVariant } from '../../invitationFlow/types'
import './eventGuestConfirm.css'

const { Text } = Typography

type Props = {
  event: Event
  variant: EventGuestConfirmVariant
  invitation: Invitation
  ticket: Product
  fieldDefinitions: FieldDefinition[]
  slots: GuestConfirmFormSlot[]
  onSlotsChange: (slots: GuestConfirmFormSlot[]) => void
  phase: GuestConfirmPhase
  onPhaseChange: (phase: GuestConfirmPhase) => void
  currentIndex: number
  onCurrentIndexChange: (index: number) => void
  onBack: () => void
  onReviewBackToForm: () => void
  onAttendanceConfirmed: () => void
  validationHighlight?: GuestSlotValidationResult | null
  validationHighlightGuestIndex?: number
  onValidationHighlightClear?: () => void
}

type FormViewProps = {
  event: Event
  slots: GuestConfirmFormSlot[]
  currentIndex: number
  fieldDefinitions: FieldDefinition[]
  validation: GuestSlotValidationResult | null
  onBack: () => void
  onContinue: () => void
  onPrevGuest: () => void
  onNextGuest: () => void
  onUpdateSlot: (patch: Partial<GuestConfirmFormSlot>) => void
  onUpdateFieldValue: (fieldId: string, value: string) => void
}

function GuestConfirmFormView({
  event,
  slots,
  currentIndex,
  fieldDefinitions,
  validation,
  onBack,
  onContinue,
  onPrevGuest,
  onNextGuest,
  onUpdateSlot,
  onUpdateFieldValue,
}: FormViewProps) {
  const { t } = useTranslation()
  const totalGuests = slots.length
  const current = slots[currentIndex]
  if (!current) return null

  const isAttending = current.attending !== false

  return (
    <>
      <GuestFlowBlockHeader
        icon={<TeamOutlined />}
        title={t('events.detail.guestConfirm.title')}
        subtitle={t('events.detail.guestConfirm.subtitle', { name: event.name })}
      />

      <Flex align="center" justify="space-between" gap={12} style={{ width: '100%' }}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          disabled={currentIndex === 0}
          onClick={onPrevGuest}
          aria-label={t('events.detail.guestConfirm.prevGuest')}
        />
        <Text strong style={{ fontSize: 15 }}>
          {t('events.detail.guestConfirm.guestOfTotal', {
            current: currentIndex + 1,
            total: totalGuests,
          })}
        </Text>
        <Button
          type="text"
          icon={<RightOutlined />}
          disabled={currentIndex >= totalGuests - 1}
          onClick={onNextGuest}
          aria-label={t('events.detail.guestConfirm.nextGuest')}
        />
      </Flex>

      <Flex vertical gap={16} style={{ width: '100%', textAlign: 'left' }}>
        <div className="guest-confirm-name-row">
          <div className="guest-confirm-name-main">
            {current.hasPresetName ? (
              <Text className="guest-confirm-preset-name-value">
                {t('events.detail.guestConfirm.presetInvitation', { name: current.firstName })}
              </Text>
            ) : isAttending ? (
              <GuestConfirmBorderField
                label={t('events.detail.guestConfirm.firstNameLabel')}
                required
                value={current.firstName}
                onChange={(e) => onUpdateSlot({ firstName: e.target.value })}
                placeholder={t('events.detail.guestConfirm.firstNamePlaceholder')}
                hasError={validation?.missingName ?? false}
              />
            ) : null}
          </div>
          <Checkbox
            className="guest-confirm-not-attending"
            checked={!isAttending}
            onChange={(e) => onUpdateSlot({ attending: !e.target.checked })}
          >
            {t('events.detail.guestConfirm.notAttending')}
          </Checkbox>
        </div>

        {!isAttending ? (
          <Text type="secondary" className="guest-confirm-not-attending-hint">
            {t('events.detail.guestConfirm.notAttendingHint')}
          </Text>
        ) : (
          current.requiredFieldIds.map((fieldId) => {
            const isMissing = validation?.missingFieldIds.includes(fieldId) ?? false
            return (
              <GuestConfirmBorderField
                key={fieldId}
                label={fieldLabelById(fieldId, fieldDefinitions)}
                required
                value={current.fieldValues[fieldId] ?? ''}
                onChange={(e) => onUpdateFieldValue(fieldId, e.target.value)}
                placeholder={t('events.detail.guestConfirm.fieldPlaceholder')}
                hasError={isMissing}
              />
            )
          })
        )}
      </Flex>

      <GuestFlowActions>
        <Button size="large" onClick={onBack}>
          {t('events.detail.guestConfirm.back')}
        </Button>
        <Button type="primary" size="large" onClick={onContinue}>
          {t('events.detail.guestConfirm.continue')}
        </Button>
      </GuestFlowActions>
    </>
  )
}

type ReviewViewProps = {
  slots: GuestConfirmFormSlot[]
  fieldDefinitions: FieldDefinition[]
  onBack: () => void
  onConfirm: () => void
}

function GuestConfirmReviewView({ slots, fieldDefinitions, onBack, onConfirm }: ReviewViewProps) {
  const { t } = useTranslation()

  return (
    <>
      <GuestFlowBlockHeader
        icon={<TeamOutlined />}
        title={t('events.detail.guestConfirm.reviewTitle')}
        subtitle={t('events.detail.guestConfirm.reviewSubtitle')}
      />

      <Flex vertical gap={12} style={{ width: '100%' }}>
        {slots.map((slot, index) => (
          <Card key={index} size="small" style={{ textAlign: 'left' }}>
            <Flex vertical gap={10}>
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
        ))}
      </Flex>

      <GuestFlowActions>
        <Button size="large" onClick={onBack}>
          {t('events.detail.guestConfirm.reviewBack')}
        </Button>
        <Button type="primary" size="large" onClick={onConfirm}>
          {t('events.detail.guestConfirm.reviewConfirm')}
        </Button>
      </GuestFlowActions>
    </>
  )
}

export function EventGuestConfirmBlock({
  event,
  variant,
  fieldDefinitions,
  slots,
  onSlotsChange,
  phase,
  onPhaseChange,
  currentIndex,
  onCurrentIndexChange,
  onBack,
  onReviewBackToForm,
  onAttendanceConfirmed,
  validationHighlight,
  validationHighlightGuestIndex,
  onValidationHighlightClear,
}: Props) {
  const { t } = useTranslation()
  const [validation, setValidation] = useState<GuestSlotValidationResult | null>(null)

  const displayValidation = validation ?? validationHighlight ?? null

  if (variant !== 'wedding') return null

  const current = slots[currentIndex]

  const updateSlot = (patch: Partial<GuestConfirmFormSlot>) => {
    setValidation(null)
    onValidationHighlightClear?.()
    onSlotsChange(slots.map((slot, i) => (i === currentIndex ? { ...slot, ...patch } : slot)))
  }

  const updateFieldValue = (fieldId: string, value: string) => {
    setValidation(null)
    onValidationHighlightClear?.()
    onSlotsChange(
      slots.map((slot, i) =>
        i === currentIndex
          ? { ...slot, fieldValues: { ...slot.fieldValues, [fieldId]: value } }
          : slot,
      ),
    )
  }

  const validateCurrentGuest = () => {
    if (!current) return false
    const result = validateGuestSlot(current)
    setValidation(result.valid ? null : result)
    if (!result.valid) {
      showGuestConfirmValidationMessage(t, result, fieldDefinitions)
    }
    return result.valid
  }

  const handleContinue = () => {
    if (!validateCurrentGuest()) return
    if (currentIndex < slots.length - 1) {
      onCurrentIndexChange(currentIndex + 1)
      setValidation(null)
      return
    }
    onPhaseChange('review')
    setValidation(null)
  }

  const handleReviewBack = () => {
    onReviewBackToForm()
    setValidation(null)
  }

  const handleFormBack = () => {
    if (currentIndex > 0) {
      onCurrentIndexChange(currentIndex - 1)
      setValidation(null)
      return
    }
    onBack()
  }

  const handlePrevGuest = () => {
    onCurrentIndexChange(Math.max(0, currentIndex - 1))
    setValidation(null)
  }

  const handleNextGuest = () => {
    if (!validateCurrentGuest()) return
    onCurrentIndexChange(Math.min(slots.length - 1, currentIndex + 1))
    setValidation(null)
  }

  useEffect(() => {
    if (
      !validationHighlight ||
      validationHighlightGuestIndex === undefined ||
      phase !== 'form'
    ) {
      return
    }
    if (validationHighlightGuestIndex !== currentIndex) {
      onCurrentIndexChange(validationHighlightGuestIndex)
    }
    setValidation(validationHighlight)
  }, [
    validationHighlight,
    validationHighlightGuestIndex,
    phase,
    currentIndex,
    onCurrentIndexChange,
  ])

  if (phase === 'form' && !current) return null

  return (
    <GuestFlowContentPanel panelSize="fit">
      {phase === 'form' && current ? (
        <GuestConfirmFormView
          key={`guest-confirm-form-${currentIndex}`}
          event={event}
          slots={slots}
          currentIndex={currentIndex}
          fieldDefinitions={fieldDefinitions}
          validation={displayValidation}
          onBack={handleFormBack}
          onContinue={handleContinue}
          onPrevGuest={handlePrevGuest}
          onNextGuest={handleNextGuest}
          onUpdateSlot={updateSlot}
          onUpdateFieldValue={updateFieldValue}
        />
      ) : (
        <GuestConfirmReviewView
          slots={slots}
          fieldDefinitions={fieldDefinitions}
          onBack={handleReviewBack}
          onConfirm={onAttendanceConfirmed}
        />
      )}
    </GuestFlowContentPanel>
  )
}

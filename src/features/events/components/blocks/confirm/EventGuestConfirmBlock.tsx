import { LeftOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Flex, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event, FieldDefinition, Invitation, Product } from '@/shared/types/api'
import type { GuestConfirmPhase } from '../../invitationFlow/lib/guestFlowDraft'
import {
  allGuestsNotAttending,
  formatReviewFieldLine,
  formatReviewGuestHeading,
  resolveGuestReviewDisplayName,
  resolveGuestReviewFieldIds,
  showGuestConfirmValidationMessage,
  validateSpot,
  type GuestConfirmFormSlot,
  type SpotValidationResult,
} from '../../invitationFlow/lib/guestConfirmMock'
import { GuestConfirmFieldInput } from './GuestConfirmFieldInput'
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
  onBack?: () => void
  onBackToWelcome?: () => void
  onReviewBackToForm: () => void
  onAttendanceConfirmed: () => void
  editFromFinished?: boolean
  onCancelEdit?: () => void
  validationHighlight?: SpotValidationResult | null
  validationHighlightGuestIndex?: number
  onValidationHighlightClear?: () => void
}

type FormViewProps = {
  event: Event
  slots: GuestConfirmFormSlot[]
  currentIndex: number
  fieldDefinitions: FieldDefinition[]
  validation: SpotValidationResult | null
  onBack?: () => void
  backLabel?: string
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
  backLabel,
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
                {t('events.detail.guestConfirm.presetInvitation', { name: current.name })}
              </Text>
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
            const isInvalid = validation?.invalidFieldIds.includes(fieldId) ?? false
            return (
              <GuestConfirmFieldInput
                key={fieldId}
                fieldId={fieldId}
                fieldDefinitions={fieldDefinitions}
                required
                value={current.fieldValues[fieldId] ?? ''}
                onChange={(value) => onUpdateFieldValue(fieldId, value)}
                hasMissingError={isMissing}
                showValidation={validation !== null && (isMissing || isInvalid)}
              />
            )
          })
        )}
      </Flex>

      <GuestFlowActions>
        {onBack ? (
          <Button size="large" onClick={onBack}>
            {backLabel ?? t('events.detail.guestConfirm.back')}
          </Button>
        ) : null}
        <Button type="primary" size="large" onClick={onContinue}>
          {t('events.detail.guestConfirm.continue')}
        </Button>
      </GuestFlowActions>
    </>
  )
}

type ReviewViewProps = {
  slots: GuestConfirmFormSlot[]
  ticket: Product
  fieldDefinitions: FieldDefinition[]
  onBack: () => void
  onConfirm: () => void
  backLabel: string
}

function GuestConfirmReviewView({
  slots,
  ticket,
  fieldDefinitions,
  onBack,
  onConfirm,
  backLabel,
}: ReviewViewProps) {
  const { t } = useTranslation()
  const everyoneDeclined = allGuestsNotAttending(slots)

  return (
    <>
      <GuestFlowBlockHeader
        icon={<TeamOutlined />}
        title={
          everyoneDeclined
            ? t('events.detail.guestConfirm.reviewAllDeclinedTitle')
            : t('events.detail.guestConfirm.reviewTitle')
        }
        subtitle={
          everyoneDeclined
            ? t('events.detail.guestConfirm.reviewAllDeclinedSubtitle')
            : t('events.detail.guestConfirm.reviewSubtitle')
        }
      />

      {!everyoneDeclined ? (
        <Flex vertical gap={12} style={{ width: '100%' }}>
          {slots.map((slot, index) => (
            <Card key={index} size="small" style={{ textAlign: 'left' }}>
              <Flex vertical gap={10}>
                <Text strong style={{ fontSize: 16 }}>
                  {formatReviewGuestHeading(
                    slot,
                    index + 1,
                    t,
                    resolveGuestReviewDisplayName(slot),
                  )}
                </Text>
                {slot.attending === false ? null : (() => {
                  const displayFieldIds = resolveGuestReviewFieldIds(slot, ticket)
                  if (displayFieldIds.length === 0) return null
                  return displayFieldIds.map((fieldId) => (
                    <Text key={fieldId} style={{ fontSize: 16 }}>
                      {formatReviewFieldLine(fieldId, slot, fieldDefinitions, t)}
                    </Text>
                  ))
                })()}
              </Flex>
            </Card>
          ))}
        </Flex>
      ) : null}

      <GuestFlowActions>
        <Button size="large" onClick={onBack}>
          {backLabel}
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
  ticket,
  fieldDefinitions,
  slots,
  onSlotsChange,
  phase,
  onPhaseChange,
  currentIndex,
  onCurrentIndexChange,
  onBack,
  onBackToWelcome,
  onReviewBackToForm,
  onAttendanceConfirmed,
  editFromFinished = false,
  onCancelEdit,
  validationHighlight,
  validationHighlightGuestIndex,
  onValidationHighlightClear,
}: Props) {
  const { t } = useTranslation()
  const [validation, setValidation] = useState<SpotValidationResult | null>(null)

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
      slots.map((slot, i) => {
        if (i !== currentIndex) return slot
        return {
          ...slot,
          fieldValues: { ...slot.fieldValues, [fieldId]: value },
        }
      }),
    )
  }

  const validateCurrentGuest = () => {
    if (!current) return false
    const result = validateSpot(current, fieldDefinitions)
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
    if (editFromFinished && onCancelEdit) {
      onCancelEdit()
      setValidation(null)
      return
    }
    onBack?.()
  }

  const reviewBackLabel = t('events.detail.guestConfirm.reviewBack')

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
          onBack={
            currentIndex > 0 || editFromFinished
              ? handleFormBack
              : onBackToWelcome
          }
          backLabel={
            editFromFinished && currentIndex === 0
              ? t('events.detail.guestFinished.cancelEdit')
              : undefined
          }
          onContinue={handleContinue}
          onPrevGuest={handlePrevGuest}
          onNextGuest={handleNextGuest}
          onUpdateSlot={updateSlot}
          onUpdateFieldValue={updateFieldValue}
        />
      ) : (
        <GuestConfirmReviewView
          slots={slots}
          ticket={ticket}
          fieldDefinitions={fieldDefinitions}
          onBack={handleReviewBack}
          onConfirm={onAttendanceConfirmed}
          backLabel={reviewBackLabel}
        />
      )}
    </GuestFlowContentPanel>
  )
}

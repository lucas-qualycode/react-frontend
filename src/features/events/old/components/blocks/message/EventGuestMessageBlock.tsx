import { HeartOutlined, MailOutlined } from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Event } from '@/shared/types/api'
import type { GuestMessagePhase } from '../../invitationFlow/lib/guestFlowDraft'
import {
  isValidGuestEmail,
  showGuestMessageEmailInvalidError,
  showGuestMessageEmailValidationError,
} from '../../invitationFlow/lib/guestMessageEmail'
import { GuestFlowActions } from '../../invitationFlow/shared/GuestFlowActions'
import { GuestFlowBlockHeader } from '../../invitationFlow/shared/GuestFlowBlockHeader'
import { GuestFlowBorderField } from '../../invitationFlow/shared/GuestFlowBorderField'
import { GuestFlowContentPanel } from '../../invitationFlow/shared/GuestFlowContentPanel'
import type { EventGuestMessageVariant } from '../../invitationFlow/types'
import './eventGuestMessage.css'

const { Text } = Typography

export const GUEST_COUPLE_MESSAGE_MAX_LENGTH = 4000

type Props = {
  event: Event
  variant: EventGuestMessageVariant
  phase: GuestMessagePhase
  email: string
  message: string
  emailSubStepSkipped: boolean
  onEmailChange: (email: string) => void
  onMessageChange: (message: string) => void
  onPhaseChange: (phase: GuestMessagePhase) => void
  onBack?: () => void
  onContinue: () => void
}

export function EventGuestMessageBlock({
  variant,
  phase,
  email,
  message,
  emailSubStepSkipped,
  onEmailChange,
  onMessageChange,
  onPhaseChange,
  onBack,
  onContinue,
}: Props) {
  const { t } = useTranslation()
  const [emailTouched, setEmailTouched] = useState(false)

  if (variant !== 'wedding') return null

  const handleEmailContinue = () => {
    setEmailTouched(true)
    const trimmed = email.trim()
    if (!trimmed) {
      showGuestMessageEmailValidationError(t)
      return
    }
    if (!isValidGuestEmail(trimmed)) {
      showGuestMessageEmailInvalidError(t)
      return
    }
    onPhaseChange('compose')
  }

  const handleComposeBack = () => {
    if (emailSubStepSkipped) {
      onBack?.()
      return
    }
    onPhaseChange('email')
  }

  if (phase === 'email') {
    return (
      <GuestFlowContentPanel panelSize="fit">
        <GuestFlowBlockHeader
          icon={<MailOutlined />}
          title={t('events.detail.guestMessage.emailTitle')}
          subtitle={t('events.detail.guestMessage.emailSubtitle')}
        />

        <Flex vertical gap={8} className="guest-message-form" style={{ width: '100%' }}>
          <GuestFlowBorderField
            label={t('events.detail.guestMessage.emailLabel')}
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={t('events.detail.guestMessage.emailPlaceholder')}
            hasError={emailTouched && !isValidGuestEmail(email.trim())}
          />
        </Flex>

        <GuestFlowActions>
          {onBack ? (
            <Button size="large" onClick={onBack}>
              {t('events.detail.guestMessage.back')}
            </Button>
          ) : null}
          <Button type="primary" size="large" onClick={handleEmailContinue}>
            {t('events.detail.guestMessage.continue')}
          </Button>
        </GuestFlowActions>
      </GuestFlowContentPanel>
    )
  }

  return (
    <GuestFlowContentPanel panelSize="fit">
      <GuestFlowBlockHeader
        icon={<HeartOutlined />}
        title={t('events.detail.guestMessage.title')}
        subtitle={t('events.detail.guestMessage.subtitle')}
      />

      <Flex vertical gap={8} className="guest-message-form" style={{ width: '100%' }}>
        <GuestFlowBorderField
          label={t('events.detail.guestMessage.fieldLabel')}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder={t('events.detail.guestMessage.fieldPlaceholder')}
          multiline
          rows={8}
          maxLength={GUEST_COUPLE_MESSAGE_MAX_LENGTH}
          showCount
        />
        <Text type="secondary" className="guest-message-optional-hint">
          {t('events.detail.guestMessage.optionalHint')}
        </Text>
      </Flex>

      <GuestFlowActions>
        {onBack || !emailSubStepSkipped ? (
          <Button size="large" onClick={handleComposeBack}>
            {t('events.detail.guestMessage.back')}
          </Button>
        ) : null}
        <Button type="primary" size="large" onClick={onContinue}>
          {t('events.detail.guestMessage.continue')}
        </Button>
      </GuestFlowActions>
    </GuestFlowContentPanel>
  )
}

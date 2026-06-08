import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { InvitationAccessFailureCode } from '@/shared/api/invitationAccess'
import './guestInvitationAccessError.css'

const { Title, Paragraph } = Typography

export type GuestInvitationAccessErrorVariant =
  | 'expired'
  | 'invalid_token'
  | 'required'
  | 'generic'

type Props = {
  variant: GuestInvitationAccessErrorVariant
  title: string
  message: string
  retryLabel?: string
  onRetry?: () => void
}

function iconForVariant(variant: GuestInvitationAccessErrorVariant): ReactNode {
  if (variant === 'expired') {
    return <ClockCircleOutlined aria-hidden />
  }
  if (variant === 'invalid_token' || variant === 'required') {
    return <LinkOutlined aria-hidden />
  }
  return <ExclamationCircleOutlined aria-hidden />
}

function iconToneClass(variant: GuestInvitationAccessErrorVariant): string {
  if (variant === 'generic') {
    return 'guest-invitation-access-error-icon--info'
  }
  return 'guest-invitation-access-error-icon--warning'
}

export function useGuestInvitationAccessErrorContent(input: {
  failureCode?: InvitationAccessFailureCode | null
  missingInvitationId?: boolean
  assumeInvitationLink?: boolean
  genericMessage?: string
}): {
  variant: GuestInvitationAccessErrorVariant
  title: string
  message: string
} {
  const { t } = useTranslation()

  return useMemo(() => {
    if (input.missingInvitationId) {
      return {
        variant: 'required' as const,
        title: t('events.detail.invitationAccessRequiredTitle'),
        message: t('events.detail.invitationAccessRequiredBody'),
      }
    }

    const code = input.failureCode
    if (code === 'invitation_expired') {
      return {
        variant: 'expired' as const,
        title: t('events.detail.invitationAccessExpiredTitle'),
        message: t('events.detail.invitationAccessExpiredBody'),
      }
    }

    if (code === 'invitation_access_token_invalid' || input.assumeInvitationLink) {
      return {
        variant: 'invalid_token' as const,
        title: t('events.detail.invitationAccessInvalidTitle'),
        message: t('events.detail.invitationAccessInvalidBody'),
      }
    }

    return {
      variant: 'generic' as const,
      title: t('events.detail.invitationAccessGenericTitle'),
      message:
        input.genericMessage?.trim() ||
        t('events.detail.invitationAccessGenericBody'),
    }
  }, [
    input.assumeInvitationLink,
    input.failureCode,
    input.genericMessage,
    input.missingInvitationId,
    t,
  ])
}

export function GuestInvitationAccessErrorPanel({
  variant,
  title,
  message,
  retryLabel,
  onRetry,
}: Props) {
  return (
    <Flex
      className="guest-invitation-access-error"
      align="center"
      justify="center"
      style={{ minHeight: 280, width: '100%', padding: 24 }}
    >
      <div className="guest-invitation-access-error-card">
        <span
          className={`guest-invitation-access-error-icon ${iconToneClass(variant)}`}
          aria-hidden
        >
          {iconForVariant(variant)}
        </span>
        <Title level={4} className="guest-invitation-access-error-title">
          {title}
        </Title>
        <Paragraph type="secondary" className="guest-invitation-access-error-message">
          {message}
        </Paragraph>
        {onRetry ? (
          <div className="guest-invitation-access-error-actions">
            <Button type="primary" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </Flex>
  )
}

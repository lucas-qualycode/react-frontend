import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  GuestInvitationAccessErrorPanel,
  useGuestInvitationAccessErrorContent,
} from '@/features/events/components/invitationFlow/shared/GuestInvitationAccessErrorPanel'
import type { InvitationAccessFailureCode } from '@/shared/api/invitationAccess'

function parseUnavailableReason(
  raw: string | null,
): InvitationAccessFailureCode | 'required' | 'generic' | null {
  if (raw === 'invitation_expired' || raw === 'invitation_access_token_invalid') {
    return raw
  }
  if (raw === 'required') return 'required'
  if (raw === 'generic') return 'generic'
  return null
}

export function InvitationUnavailablePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const reason = parseUnavailableReason(searchParams.get('reason'))

  const content = useGuestInvitationAccessErrorContent({
    failureCode:
      reason === 'invitation_expired' || reason === 'invitation_access_token_invalid'
        ? reason
        : null,
    missingInvitationId: reason === 'required',
    genericMessage: t('events.detail.invitationAccessGenericBody'),
  })

  return (
    <GuestInvitationAccessErrorPanel
      variant={content.variant}
      title={content.title}
      message={content.message}
    />
  )
}

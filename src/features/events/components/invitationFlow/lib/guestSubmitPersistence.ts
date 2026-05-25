import { message } from 'antd'
import { submitGuestInvitation } from '@/features/events/api'
import type { InvitationAccess } from '@/shared/api/invitationAccess'
import type { Invitation } from '@/shared/types/api'
import { USE_MOCK_INVITATION } from './guestInvitationMock'
import type { SubmitGuestMessagePayload, SubmitGuestSlotsPayload } from './guestSubmitPayload'

export function persistGuestSlotsInBackground(
  invitationId: string,
  payload: SubmitGuestSlotsPayload,
  onSuccess: (invitation: Invitation) => void,
  saveFailedLabel: string,
  invitationAccess?: InvitationAccess | null,
): void {
  if (USE_MOCK_INVITATION) return

  void submitGuestInvitation(invitationId, payload, invitationAccess)
    .then(onSuccess)
    .catch(() => {
      message.error(saveFailedLabel)
    })
}

export function persistGuestMessageInBackground(
  invitationId: string,
  payload: SubmitGuestMessagePayload,
  onSuccess: (invitation: Invitation) => void,
  saveFailedLabel: string,
  invitationAccess?: InvitationAccess | null,
): void {
  if (USE_MOCK_INVITATION) return

  void submitGuestInvitation(invitationId, payload, invitationAccess)
    .then(onSuccess)
    .catch(() => {
      message.error(saveFailedLabel)
    })
}

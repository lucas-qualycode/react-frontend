import { Button, Card, Flex, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createWizardInvitationEditPath,
  createWizardInvitationNewPath,
  createWizardTicketsPath,
} from '@/features/events/create/createWizardSteps'
import { EventManageListSection } from '@/features/events/edit/sections/EventManageListSection'
import { useCompleteEventSetup } from '@/features/events/hooks'

export function NewInvitationsStepPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const completeSetupMutation = useCompleteEventSetup()

  async function handleFinish() {
    if (!eventId) return
    try {
      await completeSetupMutation.mutateAsync(eventId)
      message.success(t('events.create.finishSuccess'))
      navigate(`/events/${eventId}/edit/details`)
    } catch {
      message.error(t('events.form.submitError'))
    }
  }

  if (!eventId) return null

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <EventManageListSection
        eventId={eventId}
        variant="invitation"
        onCreate={() => navigate(createWizardInvitationNewPath(eventId))}
        onEdit={(invitationId) => navigate(createWizardInvitationEditPath(eventId, invitationId))}
      />
      <Flex justify="flex-end" gap={8} wrap="wrap" style={{ width: '100%', marginTop: 16 }}>
        <Button htmlType="button" onClick={() => navigate(createWizardTicketsPath(eventId))}>
          {t('events.create.back')}
        </Button>
        <Button
          type="primary"
          loading={completeSetupMutation.isPending}
          onClick={() => void handleFinish()}
        >
          {t('events.create.finish')}
        </Button>
      </Flex>
    </Card>
  )
}

import { Button, Card, Flex } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createWizardMerchEditPath,
  createWizardMerchNewPath,
  createWizardSchedulePath,
  createWizardTicketsPath,
} from '@/features/events/create/createWizardSteps'
import { EventManageListSection } from '@/features/events/edit/sections/EventManageListSection'

export function NewProductsStepPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()

  if (!eventId) return null

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <EventManageListSection
        eventId={eventId}
        variant="merchandise"
        onMerchCreate={() => navigate(createWizardMerchNewPath(eventId))}
        onMerchEdit={(productId) => navigate(createWizardMerchEditPath(eventId, productId))}
      />
      <Flex justify="flex-end" gap={8} wrap="wrap" style={{ width: '100%', marginTop: 16 }}>
        <Button htmlType="button" onClick={() => navigate(createWizardSchedulePath(eventId))}>
          {t('events.create.back')}
        </Button>
        <Button htmlType="button" onClick={() => navigate(createWizardTicketsPath(eventId))}>
          {t('events.create.skip')}
        </Button>
        <Button type="primary" onClick={() => navigate(createWizardTicketsPath(eventId))}>
          {t('events.create.next')}
        </Button>
      </Flex>
    </Card>
  )
}

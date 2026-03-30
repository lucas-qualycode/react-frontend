import { ArrowLeftOutlined } from '@ant-design/icons'
import { Grid, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { EditorPageColumn } from '@/shared/components/EditorPageColumn'
import { PageBreadcrumbBar } from '@/shared/components/PageBreadcrumbBar'
import { PageHeaderRow } from '@/shared/components/PageHeaderRow'
import { ResponsiveLabelButton } from '@/shared/components/ResponsiveLabelButton'
import { EventForm } from '../components/EventForm'
import { useCreateEvent } from '../hooks'
import { type CreateEventPayload, type UpdateEventPayload } from '../api'

export function EventCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createMutation = useCreateEvent()
  const screens = Grid.useBreakpoint()
  const backButtonIconOnly = screens.md === false

  const initialValues = {
    name: '',
    description: '',
    location_id: '',
    imageURL: '',
    tag_ids: [],
    is_paid: false,
    is_online: false,
  }

  async function handleSubmit(payload: CreateEventPayload | UpdateEventPayload) {
    try {
      const created = await createMutation.mutateAsync(payload as CreateEventPayload)
      navigate(`/events/${created.id}/edit`)
    } catch {
      message.error(t('events.form.submitError'))
    }
  }

  return (
    <EditorPageColumn>
      <PageBreadcrumbBar
        items={[
          { title: <Link to="/user-events">{t('userEvents.title')}</Link> },
          { title: t('events.create.title') },
        ]}
      />
      <PageHeaderRow
        title={t('events.create.title')}
        subtitle={t('events.create.subtitle')}
        actions={
          <ResponsiveLabelButton
            type="default"
            icon={<ArrowLeftOutlined />}
            iconOnly={backButtonIconOnly}
            tooltipTitle={t('userEvents.title')}
            onClick={() => navigate('/user-events')}
          >
            {t('userEvents.title')}
          </ResponsiveLabelButton>
        }
      />
      <EventForm
        mode="create"
        initialValues={initialValues}
        submitLoading={createMutation.isPending}
        onSubmit={handleSubmit}
      />
    </EditorPageColumn>
  )
}

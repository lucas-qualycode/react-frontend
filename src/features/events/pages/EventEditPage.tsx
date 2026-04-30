import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import { App, Button, Flex, Grid, Spin, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EditorPageColumn } from '@/shared/components/EditorPageColumn'
import { PageBreadcrumbBar } from '@/shared/components/PageBreadcrumbBar'
import { PageHeaderRow } from '@/shared/components/PageHeaderRow'
import { ResponsiveLabelButton } from '@/shared/components/ResponsiveLabelButton'
import { EventForm } from '../components/EventForm'
import { useEvent, useUpdateEvent } from '../hooks'
import type { UpdateEventPayload } from '../api'

const { Title, Text } = Typography

export function EventEditPage() {
  const { t } = useTranslation()
  const { modal, message } = App.useApp()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const editSectionSlug = searchParams.get('section')
  const updateMutation = useUpdateEvent()
  const { data: event, isLoading, isError, refetch } = useEvent(id)
  const screens = Grid.useBreakpoint()
  const backButtonIconOnly = screens.md === false
  const [formDirty, setFormDirty] = useState(false)
  const leaveModalShownRef = useRef(false)

  const initialValues = useMemo(
    () =>
      event
        ? {
            name: event.name,
            description: event.description ?? '',
            location_id: event.location_id ?? '',
            imageURL: event.imageURL ?? '',
            tag_ids: event.tags?.map((x) => x.id) ?? [],
            active: event.active,
            is_paid: event.is_paid,
            is_online: event.is_online,
          }
        : null,
    [event]
  )

  const blocker = useBlocker(formDirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      leaveModalShownRef.current = false
      return
    }
    if (leaveModalShownRef.current) return
    leaveModalShownRef.current = true
    modal.confirm({
      title: t('events.edit.leaveUnsavedTitle'),
      content: t('events.edit.leaveUnsavedBody'),
      okText: t('events.edit.leaveUnsavedLeave'),
      cancelText: t('events.edit.leaveUnsavedStay'),
      onOk: () => {
        leaveModalShownRef.current = false
        blocker.proceed()
      },
      onCancel: () => {
        leaveModalShownRef.current = false
        blocker.reset()
      },
    })
  }, [blocker, modal, t])

  useEffect(() => {
    if (!formDirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formDirty])

  const handleSubmit = useCallback(
    async (payload: UpdateEventPayload) => {
      if (!id) return
      try {
        await updateMutation.mutateAsync({ eventId: id, payload })
        flushSync(() => {
          setFormDirty(false)
        })
        message.success(t('events.edit.saveSuccess'))
      } catch {
        message.error(t('events.form.submitError'))
      }
    },
    [id, message, t, updateMutation]
  )

  const breadcrumbItems = useMemo(() => {
    if (!id || !event) return []
    const base = [
      { title: <Link to="/user-events">{t('userEvents.title')}</Link> },
      { title: <Link to={`/events/${id}`}>{event.name}</Link> },
    ]
    if (editSectionSlug === 'invitation-new') {
      return [
        ...base,
        {
          title: (
            <Link to={`/events/${id}/edit?section=invitations`}>{t('events.form.menuInvitations')}</Link>
          ),
        },
        { title: t('events.invitations.breadcrumbNew') },
      ]
    }
    if (editSectionSlug === 'invitation-edit') {
      return [
        ...base,
        {
          title: (
            <Link to={`/events/${id}/edit?section=invitations`}>{t('events.form.menuInvitations')}</Link>
          ),
        },
        { title: t('events.invitations.breadcrumbEdit') },
      ]
    }
    return [...base, { title: t('events.detail.edit') }]
  }, [editSectionSlug, event, id, t])

  return (
    <EditorPageColumn>
      {isLoading ? (
        <Flex style={{ minHeight: 240 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      ) : null}

      {isError ? (
        <Flex vertical align="center" justify="center" gap={12} style={{ minHeight: 240 }}>
          <Text type="danger">{t('events.detail.loadError')}</Text>
          <Button onClick={() => refetch()}>{t('events.detail.retry')}</Button>
        </Flex>
      ) : null}

      {!isLoading && !isError && event && id && initialValues ? (
        <>
          <PageBreadcrumbBar items={breadcrumbItems} />
          <PageHeaderRow
            title={
              <Title level={2} style={{ marginBottom: 0 }}>
                {event.name}
              </Title>
            }
            actions={
              <>
                <ResponsiveLabelButton
                  type="default"
                  icon={<EyeOutlined />}
                  iconOnly={backButtonIconOnly}
                  tooltipTitle={t('events.edit.viewEventPage')}
                  onClick={() => navigate(`/events/${id}`)}
                >
                  {t('events.edit.viewEventPage')}
                </ResponsiveLabelButton>
                <ResponsiveLabelButton
                  type="default"
                  icon={<ArrowLeftOutlined />}
                  iconOnly={backButtonIconOnly}
                  tooltipTitle={t('userEvents.title')}
                  onClick={() => navigate('/user-events')}
                >
                  {t('userEvents.title')}
                </ResponsiveLabelButton>
              </>
            }
          />
          <EventForm
            mode="edit"
            eventId={id}
            initialValues={initialValues}
            submitLoading={updateMutation.isPending}
            onSubmit={handleSubmit}
            onDirtyChange={setFormDirty}
          />
        </>
      ) : null}
    </EditorPageColumn>
  )
}

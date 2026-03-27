import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import { App, Button, Flex, Grid, Spin, Tooltip, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useBlocker, useParams } from 'react-router-dom'
import { PageBreadcrumbBar } from '@/shared/components/PageBreadcrumbBar'
import { EventForm } from '../components/EventForm'
import { useEvent, useUpdateEvent } from '../hooks'
import type { UpdateEventPayload } from '../api'

const { Title, Text } = Typography

export function EventEditPage() {
  const { t } = useTranslation()
  const { modal, message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const updateMutation = useUpdateEvent()
  const { data: event, isLoading, isError, refetch } = useEvent(id)
  const screens = Grid.useBreakpoint()
  const backButtonIconOnly = screens.lg === false
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

  return (
    <Flex vertical style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      {!isLoading && !isError && event && id ? (
        <PageBreadcrumbBar
          items={[
            { title: <Link to="/user-events">{t('userEvents.title')}</Link> },
            { title: <Link to={`/events/${id}`}>{event.name}</Link> },
            { title: t('events.detail.edit') },
          ]}
        />
      ) : null}
      <Flex align="flex-start" justify="space-between" gap={16} style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>
            {event?.name ?? ''}
          </Title>
        </div>
        <Flex align="center" gap={8} wrap="wrap" style={{ flexShrink: 0 }}>
          {id ? (
            backButtonIconOnly ? (
              <Tooltip title={t('events.edit.viewEventPage')} placement="bottom">
                <span style={{ display: 'inline-flex' }}>
                  <Link to={`/events/${id}`}>
                    <Button
                      type="default"
                      icon={<EyeOutlined />}
                      aria-label={t('events.edit.viewEventPage')}
                    />
                  </Link>
                </span>
              </Tooltip>
            ) : (
              <Link to={`/events/${id}`}>
                <Button type="default" icon={<EyeOutlined />}>
                  {t('events.edit.viewEventPage')}
                </Button>
              </Link>
            )
          ) : null}
          {backButtonIconOnly ? (
            <Tooltip title={t('userEvents.title')} placement="bottom">
              <span style={{ display: 'inline-flex' }}>
                <Link to="/user-events">
                  <Button
                    icon={<ArrowLeftOutlined />}
                    aria-label={t('userEvents.title')}
                  />
                </Link>
              </span>
            </Tooltip>
          ) : (
            <Link to="/user-events">
              <Button icon={<ArrowLeftOutlined />}>{t('userEvents.title')}</Button>
            </Link>
          )}
        </Flex>
      </Flex>

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

      {!isLoading && !isError && initialValues ? (
        <EventForm
          mode="edit"
          eventId={id}
          initialValues={initialValues}
          submitLoading={updateMutation.isPending}
          onSubmit={handleSubmit}
          onDirtyChange={setFormDirty}
        />
      ) : null}
    </Flex>
  )
}

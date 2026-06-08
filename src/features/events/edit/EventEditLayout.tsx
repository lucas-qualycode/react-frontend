import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import { App, Button, Flex, Grid, Spin, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Link,
  Navigate,
  Outlet,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { EditorPageColumn } from '@/shared/components/EditorPageColumn'
import { PageBreadcrumbBar } from '@/shared/components/PageBreadcrumbBar'
import { PageHeaderRow } from '@/shared/components/PageHeaderRow'
import { ResponsiveLabelButton } from '@/shared/components/ResponsiveLabelButton'
import { SectionStepsNavLayout } from '@/shared/components/SectionStepsNavLayout'
import { useEvent } from '@/features/events/hooks'
import { createWizardIdentityPath } from '@/features/events/create/createWizardSteps'
import { isEventSetupDraft } from '@/features/events/shared/eventSetupUtils'
import {
  EventDirtyRegistryProvider,
  useEventDirtyRegistry,
} from '@/features/events/shared/EventDirtyRegistryContext'
import { EventEditProvider } from './EventEditContext'
import {
  EVENT_EDIT_TAB_ICONS,
  EVENT_EDIT_TAB_ORDER,
  eventEditTabPath,
  resolveEditTabFromPathname,
  type EventEditTabKey,
} from './eventEditTabs'

const { Title, Text } = Typography

function EventEditLayoutInner() {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const screens = Grid.useBreakpoint()
  const backButtonIconOnly = screens.md === false
  const leaveModalShownRef = useRef(false)
  const { anyDirty, discardAll } = useEventDirtyRegistry()
  const eventQuery = useEvent(id)
  const { data: event, isLoading, isError, refetch } = eventQuery

  const activeTab = useMemo((): EventEditTabKey => {
    if (!id) return 'details'
    return resolveEditTabFromPathname(location.pathname, id) ?? 'details'
  }, [id, location.pathname])

  const navItems = useMemo(
    () =>
      EVENT_EDIT_TAB_ORDER.map((key) => ({
        key,
        icon: EVENT_EDIT_TAB_ICONS[key],
        label: t(
          key === 'details'
            ? 'events.form.menuIdentity'
            : key === 'venue'
              ? 'events.form.menuVenue'
              : key === 'schedule'
                ? 'events.form.menuSchedules'
                : key === 'products'
                  ? 'events.form.menuProducts'
                  : key === 'tickets'
                    ? 'events.form.menuTickets'
                    : 'events.form.menuInvitations',
        ),
      })),
    [t],
  )

  const breadcrumbItems = useMemo(() => {
    if (!event || !id) return []
    const base = [
      { title: <Link to="/user-events">{t('userEvents.title')}</Link> },
      { title: <Link to={`/events/${id}`}>{event.name}</Link> },
      { title: <Link to={eventEditTabPath(id, 'details')}>{t('events.detail.edit')}</Link> },
    ]
    const path = location.pathname
    const tabLabel = navItems.find((x) => x.key === activeTab)?.label ?? activeTab

    if (path.includes('/edit/products/new')) {
      return [
        ...base,
        { title: <Link to={eventEditTabPath(id, 'products')}>{t('events.form.menuProducts')}</Link> },
        { title: t('events.form.addButton') },
      ]
    }
    if (path.match(/\/edit\/products\/[^/]+$/)) {
      return [
        ...base,
        { title: <Link to={eventEditTabPath(id, 'products')}>{t('events.form.menuProducts')}</Link> },
        { title: t('events.products.breadcrumbEdit') },
      ]
    }
    if (path.includes('/edit/tickets/new')) {
      return [
        ...base,
        { title: <Link to={eventEditTabPath(id, 'tickets')}>{t('events.form.menuTickets')}</Link> },
        { title: t('events.form.addButton') },
      ]
    }
    if (path.match(/\/edit\/tickets\/[^/]+$/)) {
      return [
        ...base,
        { title: <Link to={eventEditTabPath(id, 'tickets')}>{t('events.form.menuTickets')}</Link> },
        { title: t('events.tickets.breadcrumbEdit') },
      ]
    }
    if (path.includes('/edit/invitations/new')) {
      return [
        ...base,
        {
          title: (
            <Link to={eventEditTabPath(id, 'invitations')}>{t('events.form.menuInvitations')}</Link>
          ),
        },
        { title: t('events.form.addButton') },
      ]
    }
    if (path.match(/\/edit\/invitations\/[^/]+$/)) {
      return [
        ...base,
        {
          title: (
            <Link to={eventEditTabPath(id, 'invitations')}>{t('events.form.menuInvitations')}</Link>
          ),
        },
        { title: t('events.invitations.breadcrumbEdit') },
      ]
    }
    if (activeTab !== 'details') {
      return [...base, { title: tabLabel }]
    }
    return [...base, { title: t('events.detail.edit') }]
  }, [activeTab, event, id, location.pathname, navItems, t])

  const blocker = useBlocker(anyDirty)

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
        flushSync(() => {
          discardAll()
        })
        blocker.proceed()
      },
      onCancel: () => {
        leaveModalShownRef.current = false
        blocker.reset()
      },
    })
  }, [blocker, discardAll, modal, t])

  useEffect(() => {
    if (!anyDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [anyDirty])

  const handleTabChange = useCallback(
    (key: EventEditTabKey) => {
      if (!id) return
      navigate(eventEditTabPath(id, key))
    },
    [id, navigate],
  )

  if (!id) {
    return (
      <EditorPageColumn>
        <Text type="danger">{t('events.detail.loadError')}</Text>
      </EditorPageColumn>
    )
  }

  if (isLoading) {
    return (
      <EditorPageColumn>
        <Flex style={{ minHeight: 240 }} align="center" justify="center">
          <Spin size="large" />
        </Flex>
      </EditorPageColumn>
    )
  }

  if (isError || !event) {
    return (
      <EditorPageColumn>
        <Flex vertical align="center" justify="center" gap={12} style={{ minHeight: 240 }}>
          <Text type="danger">{t('events.detail.loadError')}</Text>
          <Button onClick={() => refetch()}>{t('events.detail.retry')}</Button>
        </Flex>
      </EditorPageColumn>
    )
  }

  if (isEventSetupDraft(event)) {
    return <Navigate to={createWizardIdentityPath(id)} replace />
  }

  return (
    <EventEditProvider
      value={{
        eventId: id,
        event,
        eventQuery,
      }}
    >
      <EditorPageColumn>
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
        <SectionStepsNavLayout
          sectionOrder={EVENT_EDIT_TAB_ORDER}
          items={navItems}
          activeKey={activeTab}
          onActiveKeyChange={handleTabChange}
          menuDropdownAriaLabel={t('events.form.sectionNavAria')}
          navMode="menu"
        >
          <Outlet />
        </SectionStepsNavLayout>
      </EditorPageColumn>
    </EventEditProvider>
  )
}

export function EventEditLayout() {
  return (
    <EventDirtyRegistryProvider>
      <EventEditLayoutInner />
    </EventDirtyRegistryProvider>
  )
}

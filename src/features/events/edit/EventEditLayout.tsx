import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  DollarOutlined,
  EyeOutlined,
  TeamOutlined,
} from '@ant-design/icons'
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
  eventEditMerchCatalogPath,
  eventEditMerchDashboardPath,
  eventEditMerchSalesPath,
  eventEditTabPath,
  eventEditInvitationCatalogPath,
  eventEditInvitationDashboardPath,
  eventEditInvitationGuestsPath,
  eventEditTicketCatalogPath,
  eventEditTicketDashboardPath,
  eventEditTicketSalesPath,
  resolveEditTabFromPathname,
  resolveInvitationSubNavFromPathname,
  resolveProductSubNavFromPathname,
  resolveTicketSubNavFromPathname,
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

  const activeSubKey = useMemo(() => {
    if (!id) return null
    if (activeTab === 'products') return resolveProductSubNavFromPathname(location.pathname, id)
    if (activeTab === 'tickets') return resolveTicketSubNavFromPathname(location.pathname, id)
    if (activeTab === 'invitations') return resolveInvitationSubNavFromPathname(location.pathname, id)
    return null
  }, [activeTab, id, location.pathname])

  const productsSubNav = useMemo(
    () => [
      { key: 'catalog', icon: <AppstoreOutlined />, label: t('events.products.subNavCatalog') },
      { key: 'sales', icon: <DollarOutlined />, label: t('events.products.subNavSales') },
    ],
    [t],
  )

  const ticketsSubNav = useMemo(
    () => [
      { key: 'catalog', icon: <AppstoreOutlined />, label: t('events.tickets.subNavCatalog') },
      { key: 'sales', icon: <DollarOutlined />, label: t('events.tickets.subNavSales') },
    ],
    [t],
  )

  const invitationsSubNav = useMemo(
    () => [
      { key: 'catalog', icon: <AppstoreOutlined />, label: t('events.invitations.subNavList') },
      { key: 'guests', icon: <TeamOutlined />, label: t('events.invitations.subNavGuests') },
    ],
    [t],
  )

  const subNavBySection = useMemo(
    () => ({ products: productsSubNav, tickets: ticketsSubNav, invitations: invitationsSubNav }),
    [productsSubNav, ticketsSubNav, invitationsSubNav],
  )

  const handleSubNavClick = useCallback(
    (sectionKey: EventEditTabKey, subKey: string) => {
      if (!id) return
      if (sectionKey === 'products') {
        if (subKey === 'sales') navigate(eventEditMerchSalesPath(id))
        else if (subKey === 'catalog') navigate(eventEditMerchCatalogPath(id))
        return
      }
      if (sectionKey === 'tickets') {
        if (subKey === 'sales') navigate(eventEditTicketSalesPath(id))
        else if (subKey === 'catalog') navigate(eventEditTicketCatalogPath(id))
        return
      }
      if (sectionKey === 'invitations') {
        if (subKey === 'catalog') navigate(eventEditInvitationCatalogPath(id))
        else if (subKey === 'guests') navigate(eventEditInvitationGuestsPath(id))
      }
    },
    [id, navigate],
  )

  const subNavParentClickBySection = useMemo(
    () => ({
      products: () => {
        if (!id) return
        navigate(eventEditMerchDashboardPath(id))
      },
      tickets: () => {
        if (!id) return
        navigate(eventEditTicketDashboardPath(id))
      },
      invitations: () => {
        if (!id) return
        navigate(eventEditInvitationDashboardPath(id))
      },
    }),
    [id, navigate],
  )

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

    const productsDashboardPath = eventEditMerchDashboardPath(id)

    if (path === productsDashboardPath || path === `${productsDashboardPath}/`) {
      return [...base, { title: t('events.form.menuProducts') }]
    }
    if (path.includes('/edit/products/sales')) {
      return [
        ...base,
        { title: <Link to={productsDashboardPath}>{t('events.form.menuProducts')}</Link> },
        { title: t('events.products.subNavSales') },
      ]
    }
    if (path.includes('/edit/products/new')) {
      return [
        ...base,
        { title: <Link to={productsDashboardPath}>{t('events.form.menuProducts')}</Link> },
        { title: <Link to={eventEditMerchCatalogPath(id)}>{t('events.products.subNavCatalog')}</Link> },
        { title: t('events.form.addButton') },
      ]
    }
    if (/\/edit\/products\/(?!catalog|sales|new)[^/]+$/.test(path)) {
      return [
        ...base,
        { title: <Link to={productsDashboardPath}>{t('events.form.menuProducts')}</Link> },
        { title: <Link to={eventEditMerchCatalogPath(id)}>{t('events.products.subNavCatalog')}</Link> },
        { title: t('events.products.breadcrumbEdit') },
      ]
    }
    if (activeTab === 'products' && activeSubKey === 'catalog') {
      return [
        ...base,
        { title: <Link to={productsDashboardPath}>{t('events.form.menuProducts')}</Link> },
        { title: t('events.products.subNavCatalog') },
      ]
    }

    const ticketsDashboardPath = eventEditTicketDashboardPath(id)

    if (path === ticketsDashboardPath || path === `${ticketsDashboardPath}/`) {
      return [...base, { title: t('events.form.menuTickets') }]
    }
    if (path.includes('/edit/tickets/sales')) {
      return [
        ...base,
        { title: <Link to={ticketsDashboardPath}>{t('events.form.menuTickets')}</Link> },
        { title: t('events.tickets.subNavSales') },
      ]
    }
    if (path.includes('/edit/tickets/new')) {
      return [
        ...base,
        { title: <Link to={ticketsDashboardPath}>{t('events.form.menuTickets')}</Link> },
        { title: <Link to={eventEditTicketCatalogPath(id)}>{t('events.tickets.subNavCatalog')}</Link> },
        { title: t('events.form.addButton') },
      ]
    }
    if (/\/edit\/tickets\/(?!catalog|sales|new)[^/]+$/.test(path)) {
      return [
        ...base,
        { title: <Link to={ticketsDashboardPath}>{t('events.form.menuTickets')}</Link> },
        { title: <Link to={eventEditTicketCatalogPath(id)}>{t('events.tickets.subNavCatalog')}</Link> },
        { title: t('events.tickets.breadcrumbEdit') },
      ]
    }
    if (activeTab === 'tickets' && activeSubKey === 'catalog') {
      return [
        ...base,
        { title: <Link to={ticketsDashboardPath}>{t('events.form.menuTickets')}</Link> },
        { title: t('events.tickets.subNavCatalog') },
      ]
    }
    const invitationsDashboardPath = eventEditInvitationDashboardPath(id)

    if (path === invitationsDashboardPath || path === `${invitationsDashboardPath}/`) {
      return [...base, { title: t('events.form.menuInvitations') }]
    }
    if (path.includes('/edit/invitations/new')) {
      return [
        ...base,
        { title: <Link to={invitationsDashboardPath}>{t('events.form.menuInvitations')}</Link> },
        {
          title: (
            <Link to={eventEditInvitationCatalogPath(id)}>{t('events.invitations.subNavList')}</Link>
          ),
        },
        { title: t('events.form.addButton') },
      ]
    }
    if (path.includes('/edit/invitations/guests')) {
      return [
        ...base,
        { title: <Link to={invitationsDashboardPath}>{t('events.form.menuInvitations')}</Link> },
        { title: t('events.invitations.subNavGuests') },
      ]
    }
    if (/\/edit\/invitations\/(?!catalog|guests|new)[^/]+$/.test(path)) {
      return [
        ...base,
        { title: <Link to={invitationsDashboardPath}>{t('events.form.menuInvitations')}</Link> },
        {
          title: (
            <Link to={eventEditInvitationCatalogPath(id)}>{t('events.invitations.subNavList')}</Link>
          ),
        },
        { title: t('events.invitations.breadcrumbEdit') },
      ]
    }
    if (activeTab === 'invitations' && activeSubKey === 'catalog') {
      return [
        ...base,
        { title: <Link to={invitationsDashboardPath}>{t('events.form.menuInvitations')}</Link> },
        { title: t('events.invitations.subNavList') },
      ]
    }
    if (activeTab === 'invitations' && activeSubKey === 'guests') {
      return [
        ...base,
        { title: <Link to={invitationsDashboardPath}>{t('events.form.menuInvitations')}</Link> },
        { title: t('events.invitations.subNavGuests') },
      ]
    }
    if (activeTab !== 'details') {
      return [...base, { title: tabLabel }]
    }
    return [...base, { title: t('events.detail.edit') }]
  }, [activeSubKey, activeTab, event, id, location.pathname, navItems, t])

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
          subNavBySection={subNavBySection}
          activeSubKey={activeSubKey}
          onSubNavClick={handleSubNavClick}
          subNavParentClickBySection={subNavParentClickBySection}
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

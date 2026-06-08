import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  MailOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'
import { Flex, Grid, Spin, Typography, theme } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CREATE_WIZARD_STEP_ORDER,
  createWizardStepPath,
  resolveCreateWizardStepFromPathname,
  type CreateWizardStepKey,
} from '@/features/events/create/createWizardSteps'
import { EventEditProvider } from '@/features/events/edit/EventEditContext'
import { useEvent } from '@/features/events/hooks'
import { EventDirtyRegistryProvider } from '@/features/events/shared/EventDirtyRegistryContext'
import { EditorPageColumn } from '@/shared/components/EditorPageColumn'
import { PageBreadcrumbBar } from '@/shared/components/PageBreadcrumbBar'
import { PageHeaderRow } from '@/shared/components/PageHeaderRow'
import { ResponsiveLabelButton } from '@/shared/components/ResponsiveLabelButton'
import { SectionStepsNavLayout } from '@/shared/components/SectionStepsNavLayout'

export function EventCreateWizardLayout() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { eventId } = useParams<{ eventId: string }>()
  const screens = Grid.useBreakpoint()
  const backButtonIconOnly = screens.md === false
  const eventQuery = useEvent(eventId)
  const { data: event, isLoading, isError } = eventQuery

  const activeStep = useMemo(() => resolveCreateWizardStepFromPathname(pathname), [pathname])

  const stepLabels: Record<CreateWizardStepKey, string> = useMemo(
    () => ({
      identity: t('events.form.menuIdentity'),
      venue: t('events.form.menuVenue'),
      schedule: t('events.form.menuSchedules'),
      products: t('events.form.menuProducts'),
      tickets: t('events.form.menuTickets'),
      invitations: t('events.form.menuInvitations'),
    }),
    [t],
  )

  const navItems = useMemo(
    () =>
      CREATE_WIZARD_STEP_ORDER.map((key) => ({
        key,
        icon:
          key === 'identity' ? (
            <FileTextOutlined />
          ) : key === 'venue' ? (
            <EnvironmentOutlined />
          ) : key === 'schedule' ? (
            <CalendarOutlined />
          ) : key === 'products' ? (
            <ShoppingOutlined />
          ) : key === 'tickets' ? (
            <CreditCardOutlined />
          ) : (
            <MailOutlined />
          ),
        label: stepLabels[key],
      })),
    [stepLabels],
  )

  const breadcrumbItems = useMemo(
    () => [
      { title: <Link to="/user-events">{t('userEvents.title')}</Link> },
      { title: t('events.create.title') },
      { title: stepLabels[activeStep] },
    ],
    [t, stepLabels, activeStep],
  )

  function handleStepChange(step: CreateWizardStepKey) {
    navigate(createWizardStepPath(step, eventId))
  }

  const outlet =
    eventId && isLoading && !event ? (
      <Flex style={{ minHeight: 220 }} align="center" justify="center">
        <Spin size="large" />
      </Flex>
    ) : eventId && isError && !event ? (
      <Typography.Text type="danger">{t('events.detail.loadError')}</Typography.Text>
    ) : eventId && event ? (
      <EventDirtyRegistryProvider>
        <EventEditProvider value={{ eventId, event, eventQuery }}>
          <Outlet />
        </EventEditProvider>
      </EventDirtyRegistryProvider>
    ) : (
      <Outlet />
    )

  return (
    <EditorPageColumn gap={token.marginLG}>
      <PageBreadcrumbBar items={breadcrumbItems} />
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
      <SectionStepsNavLayout
        sectionOrder={CREATE_WIZARD_STEP_ORDER}
        items={navItems}
        activeKey={activeStep}
        onActiveKeyChange={handleStepChange}
        menuDropdownAriaLabel={t('events.form.sectionNavAria')}
      >
        {outlet}
      </SectionStepsNavLayout>
    </EditorPageColumn>
  )
}

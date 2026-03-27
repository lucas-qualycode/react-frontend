import { useEffect, useMemo } from 'react'
import { MenuOutlined } from '@ant-design/icons'
import {
  Button,
  Dropdown,
  Flex,
  Grid,
  Layout,
  Menu,
  Modal,
  Spin,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthContext'
import { useUserProfile, useUpdateUserProfile } from '@/features/settings/hooks'
import { initialUserPreferencesForCreate } from '@/features/settings/initialUserPreferences'
import { SettingsSectionContent } from '@/features/settings/SettingsSectionContent'
import {
  SETTINGS_MENU_ITEMS,
  SETTINGS_SECTION_QUERY_PARAM,
  isSettingsSectionKey,
  settingsPathSearch,
} from '@/features/settings/settingsMenu'
import { SettingsLayoutOutletProvider } from '@/features/settings/SettingsLayoutOutletContext'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'
import { PageBreadcrumbBar } from '@/shared/components/PageBreadcrumbBar'

const { Content } = Layout

export function SettingsLayout() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const screens = Grid.useBreakpoint()
  const settingsIconNav = screens.md === false
  const {
    user,
    updateProfile,
    updateEmailWithPassword,
    updatePasswordWithPassword,
    revokeAllSessions,
    signOut,
    sendVerificationEmail,
  } = useAuth()
  const [modalApi, modalContextHolder] = Modal.useModal()

  const getCreatePayload = user
    ? () => ({
        id: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        emailVerified: user.emailVerified,
        preferences: initialUserPreferencesForCreate(),
      })
    : null

  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile(
    user?.uid,
    getCreatePayload
  )
  const updateMutation = useUpdateUserProfile(user?.uid ?? '')

  useEffect(() => {
    if (!user?.uid || !profile) return
    const email = user.email ?? ''
    const verified = user.emailVerified
    if (profile.email === email && profile.emailVerified === verified) return
    updateMutation.mutate({ email, emailVerified: verified })
  }, [
    user?.uid,
    user?.email,
    user?.emailVerified,
    profile?.id,
    profile?.email,
    profile?.emailVerified,
    updateMutation,
  ])

  const activeKey = useMemo(() => {
    const raw = searchParams.get(SETTINGS_SECTION_QUERY_PARAM) ?? undefined
    return isSettingsSectionKey(raw) ? raw : 'profile'
  }, [searchParams])

  useEffect(() => {
    const raw = searchParams.get(SETTINGS_SECTION_QUERY_PARAM) ?? undefined
    if (isSettingsSectionKey(raw)) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(SETTINGS_SECTION_QUERY_PARAM, 'profile')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  const sectionLabel = t(`settings.menu.${activeKey}`)

  const settingsIndexPath = useMemo(() => ({ pathname: '/settings', search: settingsPathSearch('profile') }), [])

  const breadcrumbItems = useMemo(
    () => [
      { title: <Link to="/">{t('events.breadcrumb.home')}</Link> },
      { title: <Link to={settingsIndexPath}>{t('settings.title')}</Link> },
      { title: sectionLabel },
    ],
    [t, settingsIndexPath, sectionLabel],
  )

  const menuItems = useMemo(
    () =>
      SETTINGS_MENU_ITEMS.map(({ key, icon }) => ({
        key,
        icon,
        label: t(`settings.menu.${key}`),
      })),
    [t]
  )

  const settingsDropdownItems: MenuProps['items'] = useMemo(
    () =>
      SETTINGS_MENU_ITEMS.map(({ key, icon }) => ({
        key,
        icon,
        label: t(`settings.menu.${key}`),
      })),
    [t]
  )

  const outletContext = useMemo<SettingsOutletContext>(
    () => ({
      user,
      profile,
      updateMutation,
      updateProfile,
      updateEmailWithPassword,
      updatePasswordWithPassword,
      revokeAllSessions,
      signOut,
      sendVerificationEmail,
      modalApi,
    }),
    [
      user,
      profile,
      updateMutation,
      updateProfile,
      updateEmailWithPassword,
      updatePasswordWithPassword,
      revokeAllSessions,
      signOut,
      sendVerificationEmail,
      modalApi,
    ]
  )

  if (profileLoading && !profile) {
    return (
      <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
        <PageBreadcrumbBar items={breadcrumbItems} />
        <Spin size="large" />
      </Content>
    )
  }

  if (profileError) {
    return (
      <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
        <PageBreadcrumbBar items={breadcrumbItems} />
        <Typography.Text type="danger">{t('settings.loadError')}</Typography.Text>
      </Content>
    )
  }

  return (
    <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Flex gap={settingsIconNav ? 0 : 32} vertical={settingsIconNav} align="flex-start">
        <Flex flex={1} vertical style={{ minWidth: 0, width: '100%' }}>
          {modalContextHolder}
          {settingsIconNav ? (
            <PageBreadcrumbBar
              items={breadcrumbItems}
              trailing={
                <span style={{ display: 'inline-flex' }}>
                  <Dropdown
                    menu={{
                      items: settingsDropdownItems,
                      selectedKeys: [activeKey],
                      onClick: ({ key }) => {
                        if (!isSettingsSectionKey(key)) return
                        setSearchParams(
                          (prev) => {
                            const next = new URLSearchParams(prev)
                            next.set(SETTINGS_SECTION_QUERY_PARAM, key)
                            return next
                          },
                          { replace: true },
                        )
                      },
                    }}
                    trigger={['hover', 'click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      icon={<MenuOutlined />}
                      aria-label={t('settings.menuDropdownAria')}
                      style={{ flexShrink: 0 }}
                    />
                  </Dropdown>
                </span>
              }
            />
          ) : (
            <PageBreadcrumbBar items={breadcrumbItems} />
          )}
          <SettingsLayoutOutletProvider value={outletContext}>
            <SettingsSectionContent activeKey={activeKey} />
          </SettingsLayoutOutletProvider>
        </Flex>
        {!settingsIconNav ? (
          <Menu
            selectedKeys={[activeKey]}
            onSelect={({ key }) => {
              if (!isSettingsSectionKey(key)) return
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev)
                  next.set(SETTINGS_SECTION_QUERY_PARAM, key)
                  return next
                },
                { replace: true },
              )
            }}
            mode="vertical"
            style={{ width: 220, flexShrink: 0 }}
            items={menuItems}
          />
        ) : null}
      </Flex>
    </Content>
  )
}

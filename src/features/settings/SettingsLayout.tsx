import { Suspense, useEffect, useMemo } from 'react'
import { Breadcrumb, Flex, Layout, Menu, Modal, Spin, Typography } from 'antd'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/auth/AuthContext'
import { useUserProfile, useUpdateUserProfile } from '@/features/settings/hooks'
import { SETTINGS_MENU_ITEMS, isSettingsSectionKey } from '@/features/settings/settingsMenu'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'

const { Content } = Layout

export function SettingsLayout() {
  const navigate = useNavigate()
  const location = useLocation()
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

  const segment = location.pathname.replace(/^\/settings\/?/, '').split('/')[0] || 'profile'
  const activeKey = isSettingsSectionKey(segment) ? segment : 'profile'

  const sectionLabel =
    SETTINGS_MENU_ITEMS.find((i) => i.key === activeKey)?.label ?? 'Settings'

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
        <Breadcrumb
          style={{ marginBottom: 24 }}
          items={[
            { title: <Link to="/settings/profile">Settings</Link> },
            { title: sectionLabel },
          ]}
        />
        <Spin size="large" />
      </Content>
    )
  }

  if (profileError) {
    return (
      <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
        <Breadcrumb
          style={{ marginBottom: 24 }}
          items={[
            { title: <Link to="/settings/profile">Settings</Link> },
            { title: sectionLabel },
          ]}
        />
        <Typography.Text type="danger">Failed to load profile.</Typography.Text>
      </Content>
    )
  }

  return (
    <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Flex gap={32} align="flex-start">
        <Flex flex={1} vertical style={{ minWidth: 0 }}>
          {modalContextHolder}
          <Breadcrumb
            style={{ marginBottom: 24 }}
            items={[
              { title: <Link to="/settings/profile">Settings</Link> },
              { title: sectionLabel },
            ]}
          />
          <Suspense
            fallback={
              <Flex style={{ minHeight: 200 }} align="center" justify="center">
                <Spin size="large" />
              </Flex>
            }
          >
            <Outlet context={outletContext} />
          </Suspense>
        </Flex>
        <Menu
          selectedKeys={[activeKey]}
          onSelect={({ key }) => navigate(`/settings/${key}`)}
          mode="vertical"
          style={{ width: 220, flexShrink: 0 }}
          items={SETTINGS_MENU_ITEMS.map(({ key, label, icon }) => ({ key, label, icon }))}
        />
      </Flex>
    </Content>
  )
}

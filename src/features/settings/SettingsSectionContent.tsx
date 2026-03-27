import { lazy, Suspense, type ReactNode } from 'react'
import { Flex, Spin } from 'antd'

import type { SettingsSectionKey } from '@/features/settings/settingsMenu'

const ProfileSettingsSection = lazy(() =>
  import('@/features/settings/sections/ProfileSettingsSection').then((m) => ({
    default: m.ProfileSettingsSection,
  }))
)
const NotificationsSettingsSection = lazy(() =>
  import('@/features/settings/sections/NotificationsSettingsSection').then((m) => ({
    default: m.NotificationsSettingsSection,
  }))
)
const AppearanceSettingsSection = lazy(() =>
  import('@/features/settings/sections/AppearanceSettingsSection').then((m) => ({
    default: m.AppearanceSettingsSection,
  }))
)
const LanguageRegionSettingsSection = lazy(() =>
  import('@/features/settings/sections/LanguageRegionSettingsSection').then((m) => ({
    default: m.LanguageRegionSettingsSection,
  }))
)
const SecuritySettingsSection = lazy(() =>
  import('@/features/settings/sections/SecuritySettingsSection').then((m) => ({
    default: m.SecuritySettingsSection,
  }))
)

function SectionFallback() {
  return (
    <Flex style={{ minHeight: 200 }} align="center" justify="center">
      <Spin size="large" />
    </Flex>
  )
}

export function SettingsSectionContent({ activeKey }: { activeKey: SettingsSectionKey }) {
  let inner: ReactNode
  switch (activeKey) {
    case 'profile':
      inner = <ProfileSettingsSection />
      break
    case 'notifications':
      inner = <NotificationsSettingsSection />
      break
    case 'appearance':
      inner = <AppearanceSettingsSection />
      break
    case 'language':
      inner = <LanguageRegionSettingsSection />
      break
    case 'security':
      inner = <SecuritySettingsSection />
      break
  }
  return <Suspense fallback={<SectionFallback />}>{inner}</Suspense>
}

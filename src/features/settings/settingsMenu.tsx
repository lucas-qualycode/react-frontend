import {
  BellOutlined,
  BgColorsOutlined,
  GlobalOutlined,
  LockOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons'

export type SettingsSectionKey =
  | 'profile'
  | 'notifications'
  | 'privacy'
  | 'appearance'
  | 'language'
  | 'security'

export const SETTINGS_MENU_ITEMS: {
  key: SettingsSectionKey
  label: string
  icon: React.ReactNode
}[] = [
  { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
  { key: 'notifications', label: 'Notifications', icon: <BellOutlined /> },
  { key: 'privacy', label: 'Privacy', icon: <SafetyOutlined /> },
  { key: 'appearance', label: 'Appearance', icon: <BgColorsOutlined /> },
  { key: 'language', label: 'Language & region', icon: <GlobalOutlined /> },
  { key: 'security', label: 'Security', icon: <LockOutlined /> },
]

export const SETTINGS_SECTION_KEYS = SETTINGS_MENU_ITEMS.map((i) => i.key)

export function isSettingsSectionKey(s: string | undefined): s is SettingsSectionKey {
  return !!s && SETTINGS_SECTION_KEYS.includes(s as SettingsSectionKey)
}

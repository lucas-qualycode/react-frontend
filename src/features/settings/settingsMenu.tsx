import {
  BellOutlined,
  BgColorsOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons'

export type SettingsSectionKey =
  | 'profile'
  | 'notifications'
  | 'appearance'
  | 'language'
  | 'security'

export const SETTINGS_MENU_ITEMS: {
  key: SettingsSectionKey
  icon: React.ReactNode
}[] = [
  { key: 'profile', icon: <UserOutlined /> },
  { key: 'notifications', icon: <BellOutlined /> },
  { key: 'appearance', icon: <BgColorsOutlined /> },
  { key: 'language', icon: <GlobalOutlined /> },
  { key: 'security', icon: <LockOutlined /> },
]

export const SETTINGS_SECTION_KEYS = SETTINGS_MENU_ITEMS.map((i) => i.key)

export function isSettingsSectionKey(s: string | undefined): s is SettingsSectionKey {
  return !!s && SETTINGS_SECTION_KEYS.includes(s as SettingsSectionKey)
}

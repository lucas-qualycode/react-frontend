import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ConfigProvider } from 'antd'
import { useAuth } from '@/app/auth/AuthContext'
import {
  APPEARANCE_STORAGE_KEY,
  loadAppearanceFromStorage,
  mergeAppearancePreferences,
  saveAppearanceToStorage,
} from '@/app/appearance/mergeAppearancePreferences'
import { darkTheme, lightTheme } from '@/app/antdTheme'
import { useUserProfile } from '@/features/settings/hooks'
import type { UserPreferences } from '@/features/settings/types'

const DENSITY_TO_SIZE = {
  default: 'middle',
  compact: 'small',
  comfortable: 'large',
} as const

function pickAppearanceFields(p: UserPreferences): Partial<UserPreferences> {
  return {
    themeMode: p.themeMode,
    density: p.density,
    fontSize: p.fontSize,
    reducedMotion: p.reducedMotion,
  }
}

export function AppearanceThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const getCreatePayload = useMemo(
    () =>
      user
        ? () => ({
            id: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? null,
            photoURL: user.photoURL ?? null,
            emailVerified: user.emailVerified,
          })
        : null,
    [user]
  )
  const { data: profile } = useUserProfile(user?.uid, getCreatePayload)
  const [storedPartial, setStoredPartial] = useState<Partial<UserPreferences>>(loadAppearanceFromStorage)
  const [systemDark, setSystemDark] = useState(false)
  const [systemReduceMotion, setSystemReduceMotion] = useState(false)

  useEffect(() => {
    if (!user) setStoredPartial(loadAppearanceFromStorage())
  }, [user])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => setSystemDark(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setSystemReduceMotion(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const effective = useMemo(() => {
    if (user && profile?.preferences) {
      return mergeAppearancePreferences(profile.preferences)
    }
    return mergeAppearancePreferences(storedPartial)
  }, [user, profile?.preferences, storedPartial])

  useEffect(() => {
    if (user && profile?.preferences) {
      saveAppearanceToStorage(pickAppearanceFields(mergeAppearancePreferences(profile.preferences)))
    }
  }, [user, profile?.preferences])

  const dark = useMemo(() => {
    if (effective.themeMode === 'light') return false
    if (effective.themeMode === 'dark') return true
    return systemDark
  }, [effective.themeMode, systemDark])

  const shouldReduceMotion = useMemo(() => {
    if (effective.reducedMotion === 'reduce') return true
    if (effective.reducedMotion === 'full') return false
    return systemReduceMotion
  }, [effective.reducedMotion, systemReduceMotion])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', shouldReduceMotion)
  }, [shouldReduceMotion])

  const componentSize = DENSITY_TO_SIZE[effective.density]

  const themeConfig = useMemo(() => {
    const base = dark ? darkTheme : lightTheme
    const token = base.token ?? {}
    const fontExtra =
      effective.fontSize === 'large'
        ? { fontSize: 16, fontSizeLG: 18, fontSizeSM: 14, fontSizeXL: 20 }
        : {}
    return {
      ...base,
      token: { ...token, ...fontExtra },
    }
  }, [dark, effective.fontSize])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== APPEARANCE_STORAGE_KEY || e.newValue == null) return
      try {
        setStoredPartial(JSON.parse(e.newValue) as Partial<UserPreferences>)
      } catch {
        return
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <ConfigProvider theme={themeConfig} componentSize={componentSize}>
      {children}
    </ConfigProvider>
  )
}

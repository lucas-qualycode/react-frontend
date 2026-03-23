import type { UserPreferences } from '@/features/settings/types'

export function mergeAppearancePreferences(
  p: Partial<UserPreferences> | undefined
): UserPreferences {
  return {
    notifications: p?.notifications ?? true,
    language: p?.language ?? 'pt-BR',
    timezone: p?.timezone ?? 'UTC-3',
    themeMode: p?.themeMode ?? 'system',
    density: p?.density ?? 'default',
    fontSize: p?.fontSize ?? 'standard',
    reducedMotion: p?.reducedMotion ?? 'system',
  }
}

export const APPEARANCE_STORAGE_KEY = 'partiiu-appearance'

export function loadAppearanceFromStorage(): Partial<UserPreferences> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<UserPreferences>
  } catch {
    return {}
  }
}

export function saveAppearanceToStorage(p: Partial<UserPreferences>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(p))
  } catch {
    return
  }
}

import { browserPreferredLocale } from '@/i18n/localeFromBrowser'
import type { UserPreferences } from './types'

export function initialUserPreferencesForCreate(): UserPreferences {
  return {
    notifications: true,
    language: browserPreferredLocale(),
    timezone: 'UTC-3',
    themeMode: 'system',
    density: 'default',
    fontSize: 'standard',
    reducedMotion: 'system',
  }
}

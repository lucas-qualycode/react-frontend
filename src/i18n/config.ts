import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en/translation.json'
import ptBR from '@/locales/pt-BR/translation.json'
import { I18N_STORAGE_KEY } from '@/i18n/constants'
import { browserPreferredLocale } from '@/i18n/localeFromBrowser'

function initialLanguage(): string {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(I18N_STORAGE_KEY)
  if (stored === 'pt-BR' || stored === 'en') return stored
  return browserPreferredLocale()
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'pt-BR': { translation: ptBR },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'pt-BR'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(I18N_STORAGE_KEY, lng)
  }
})

export default i18n

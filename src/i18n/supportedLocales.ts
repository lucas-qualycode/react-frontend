export const SUPPORTED_LANGUAGE_CODES = ['pt-BR', 'en'] as const

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number]

export function isSupportedLanguageCode(s: string): s is SupportedLanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(s)
}

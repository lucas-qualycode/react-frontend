export function browserPreferredLocale(): 'en' | 'pt-BR' {
  if (typeof window === 'undefined') return 'en'
  const chain =
    typeof navigator.languages !== 'undefined' && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
  for (const tag of chain) {
    const lower = tag.toLowerCase()
    if (lower.startsWith('pt')) return 'pt-BR'
    if (lower.startsWith('en')) return 'en'
  }
  return 'en'
}

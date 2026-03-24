import type { TFunction } from 'i18next'

export function securityAuthErrorMessage(err: unknown, t: TFunction): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
  const keys: Record<string, string> = {
    'auth/wrong-password': 'settings.security.errors.wrongPassword',
    'auth/invalid-credential': 'settings.security.errors.wrongPassword',
    'auth/requires-recent-login': 'settings.security.errors.requiresRecentLogin',
    'auth/email-already-in-use': 'settings.security.errors.emailInUse',
    'auth/invalid-email': 'settings.security.errors.invalidEmail',
    'auth/weak-password': 'settings.security.errors.weakPassword',
    'auth/too-many-requests': 'settings.security.errors.tooManyRequests',
    'auth/network-request-failed': 'settings.security.errors.network',
    'auth/operation-not-allowed': 'settings.security.errors.operationNotAllowed',
    'auth/internal-error': 'settings.security.errors.internalError',
  }
  const k = keys[code]
  if (k) return t(k)
  return err instanceof Error ? err.message : t('settings.security.errors.generic')
}

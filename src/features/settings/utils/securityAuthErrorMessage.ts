export function securityAuthErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
  const messages: Record<string, string> = {
    'auth/wrong-password': 'Current password is incorrect.',
    'auth/invalid-credential': 'Current password is incorrect.',
    'auth/requires-recent-login': 'Please sign in again and retry.',
    'auth/email-already-in-use': 'That email is already in use.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/operation-not-allowed':
      'Email could not be changed. If this persists, check Firebase Auth settings (authorized domains / email actions).',
    'auth/internal-error': 'Could not send email. Try again in a few minutes.',
  }
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
}

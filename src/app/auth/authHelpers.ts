import type { OAuthCredential } from 'firebase/auth'

export const EMAIL_FOR_SIGN_IN_STORAGE_KEY = 'emailForSignIn'

export const ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL =
  'auth/account-exists-with-different-credential' as const

export function isAccountExistsDifferentCredentialError(
  err: unknown
): err is {
  code: typeof ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL
  email?: string
  credential?: OAuthCredential
} {
  return (
    err != null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL
  )
}

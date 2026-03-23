import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential as firebaseLinkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  RecaptchaVerifier,
  sendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile as firebaseUpdateProfile,
  verifyBeforeUpdateEmail,
  type ConfirmationResult,
  type OAuthCredential,
  type User as FirebaseUser,
} from 'firebase/auth'
import { app } from '@/app/firebase'
import { setApiAuthGetter, setApiGuestListGetter } from '@/shared/api/client'
import { guestListStore } from '@/shared/stores/guestListStore'

const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn'

export interface AuthState {
  user: FirebaseUser | null
  loading: boolean
  getIdToken: () => Promise<string | null>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  sendSignInLinkToEmail: (email: string) => Promise<void>
  signInWithEmailLink: (email: string, link: string) => Promise<void>
  signInWithPhoneNumber: (
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
  ) => Promise<ConfirmationResult>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  linkWithCredential: (credential: OAuthCredential) => Promise<void>
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>
  reauthenticateWithPassword: (currentPassword: string) => Promise<void>
  updateEmailWithPassword: (newEmail: string, currentPassword: string) => Promise<void>
  updatePasswordWithPassword: (currentPassword: string, newPassword: string) => Promise<void>
  revokeAllSessions: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
}

export const ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL = 'auth/account-exists-with-different-credential' as const

export function isAccountExistsDifferentCredentialError(
  err: unknown
): err is { code: typeof ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL; email?: string; credential?: OAuthCredential } {
  return (
    err != null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL
  )
}

export function getEmailForSignInKey(): string {
  return EMAIL_FOR_SIGN_IN_KEY
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (ctx == null) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

const auth = getAuth(app)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const getIdToken = useCallback(async () => {
    if (!user) return null
    return user.getIdToken()
  }, [user])
  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])
  const signUp = useCallback(async (email: string, password: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
    await sendEmailVerification(newUser)
  }, [])
  const sendSignInLinkToEmailFn = useCallback(async (email: string) => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/complete`
        : ''
    await sendSignInLinkToEmail(auth, email, {
      url,
      handleCodeInApp: true,
    })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email)
    }
  }, [])
  const signInWithEmailLinkFn = useCallback(async (email: string, link: string) => {
    await signInWithEmailLink(auth, email, link)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY)
    }
  }, [])
  const signInWithPhoneNumberFn = useCallback(
    async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
      return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
    },
    []
  )
  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])
  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (err) {
      if (isAccountExistsDifferentCredentialError(err)) throw err
      const message =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code === 'auth/popup-closed-by-user'
            ? 'Sign-in cancelled.'
            : (err as { code: string }).code === 'auth/popup-blocked'
              ? 'Popup was blocked. Allow popups for this site and try again.'
              : err instanceof Error
                ? err.message
                : 'Sign-in failed. Please try again.'
          : 'Sign-in failed. Please try again.'
      throw new Error(message)
    }
  }, [])
  const linkWithCredential = useCallback(async (credential: OAuthCredential) => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('Must be signed in to link account.')
    await firebaseLinkWithCredential(currentUser, credential)
  }, [])
  const updateProfile = useCallback(
    async (updates: { displayName?: string; photoURL?: string }) => {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Must be signed in to update profile.')
      await firebaseUpdateProfile(currentUser, updates)
    },
    []
  )
  const reauthenticateWithPassword = useCallback(async (currentPassword: string) => {
    const currentUser = auth.currentUser
    if (!currentUser?.email) throw new Error('This account has no email password sign-in.')
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
    await reauthenticateWithCredential(currentUser, credential)
  }, [])
  const updateEmailWithPassword = useCallback(
    async (newEmail: string, currentPassword: string) => {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Must be signed in.')
      await reauthenticateWithPassword(currentPassword)
      const u = auth.currentUser
      if (!u) throw new Error('Must be signed in.')
      const continueUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/settings/security` : ''
      await verifyBeforeUpdateEmail(u, newEmail, {
        url: continueUrl,
        handleCodeInApp: false,
      })
    },
    [reauthenticateWithPassword]
  )
  const updatePasswordWithPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Must be signed in.')
      await reauthenticateWithPassword(currentPassword)
      const u = auth.currentUser
      if (!u) throw new Error('Must be signed in.')
      await updatePassword(u, newPassword)
    },
    [reauthenticateWithPassword]
  )
  const revokeAllSessions = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('Must be signed in.')
    const idToken = await currentUser.getIdToken(true)
    const apiKey = app.options.apiKey
    if (!apiKey || typeof apiKey !== 'string') throw new Error('Missing API key.')
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          validSince: String(Math.floor(Date.now() / 1000)),
          returnSecureToken: true,
        }),
      }
    )
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      const msg = body?.error?.message ?? `Request failed (${res.status})`
      throw new Error(msg)
    }
  }, [])
  const sendVerificationEmail = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('Must be signed in.')
    const continueUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/settings/security` : ''
    await sendEmailVerification(currentUser, {
      url: continueUrl,
      handleCodeInApp: false,
    })
  }, [])
  useEffect(() => {
    let unsub: (() => void) | undefined
    try {
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      })
    } catch (err) {
      console.warn('Firebase Auth failed to initialize:', err)
      setLoading(false)
    }
    return () => {
      unsub?.()
    }
  }, [])
  useEffect(() => {
    setApiAuthGetter(getIdToken)
    setApiGuestListGetter((url) => guestListStore.getState().getTokenForRequest(url))
  }, [getIdToken])
  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      getIdToken,
      signIn,
      signUp,
      sendSignInLinkToEmail: sendSignInLinkToEmailFn,
      signInWithEmailLink: signInWithEmailLinkFn,
      signInWithPhoneNumber: signInWithPhoneNumberFn,
      signOut,
      signInWithGoogle,
      linkWithCredential,
      updateProfile,
      reauthenticateWithPassword,
      updateEmailWithPassword,
      updatePasswordWithPassword,
      revokeAllSessions,
      sendVerificationEmail,
    }),
    [
      user,
      loading,
      getIdToken,
      signIn,
      signUp,
      sendSignInLinkToEmailFn,
      signInWithEmailLinkFn,
      signInWithPhoneNumberFn,
      signOut,
      signInWithGoogle,
      linkWithCredential,
      updateProfile,
      reauthenticateWithPassword,
      updateEmailWithPassword,
      updatePasswordWithPassword,
      revokeAllSessions,
      sendVerificationEmail,
    ]
  )
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

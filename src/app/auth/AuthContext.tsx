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
  getAuth,
  GoogleAuthProvider,
  linkWithCredential as firebaseLinkWithCredential,
  onAuthStateChanged,
  RecaptchaVerifier,
  sendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
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
    setApiGuestListGetter((url) => guestListStore.getState().getTokenForRequest(url))
  }, [])
  useEffect(() => {
    setApiAuthGetter(getIdToken)
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
    ]
  )
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

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
  onAuthStateChanged,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPhoneNumber,
  type ConfirmationResult,
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
    await createUserWithEmailAndPassword(auth, email, password)
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
    ]
  )
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

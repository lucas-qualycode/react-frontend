import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { GuestInvitationPhase } from '@/features/events/loaders/guestInvitationRoutes'

export type GuestPaymentNavigationState = {
  paymentId?: string
  orderId?: string
}

type GuestInvitationPhaseContextValue = {
  phase: GuestInvitationPhase
  setPhase: (phase: GuestInvitationPhase) => void
  goToWizard: () => void
  goToPayment: (state?: GuestPaymentNavigationState) => void
  goToConfirmed: () => void
  paymentNavigationState: GuestPaymentNavigationState | null
}

const GuestInvitationPhaseContext = createContext<GuestInvitationPhaseContextValue | null>(
  null,
)

type ProviderProps = {
  initialPhase: GuestInvitationPhase
  children: ReactNode
}

export function GuestInvitationPhaseProvider({ initialPhase, children }: ProviderProps) {
  const [phase, setPhase] = useState<GuestInvitationPhase>(initialPhase)
  const [paymentNavigationState, setPaymentNavigationState] =
    useState<GuestPaymentNavigationState | null>(null)

  useEffect(() => {
    setPhase(initialPhase)
  }, [initialPhase])

  const goToWizard = useCallback(() => {
    setPaymentNavigationState(null)
    setPhase('wizard')
  }, [])

  const goToPayment = useCallback((state?: GuestPaymentNavigationState) => {
    setPaymentNavigationState(state ?? null)
    setPhase('payment')
  }, [])

  const goToConfirmed = useCallback(() => {
    setPaymentNavigationState(null)
    setPhase('confirmed')
  }, [])

  const value = useMemo(
    (): GuestInvitationPhaseContextValue => ({
      phase,
      setPhase,
      goToWizard,
      goToPayment,
      goToConfirmed,
      paymentNavigationState,
    }),
    [goToConfirmed, goToPayment, goToWizard, paymentNavigationState, phase],
  )

  return (
    <GuestInvitationPhaseContext.Provider value={value}>
      {children}
    </GuestInvitationPhaseContext.Provider>
  )
}

export function useGuestInvitationPhase(): GuestInvitationPhaseContextValue {
  const ctx = useContext(GuestInvitationPhaseContext)
  if (!ctx) {
    throw new Error('useGuestInvitationPhase must be used within GuestInvitationPhaseProvider')
  }
  return ctx
}

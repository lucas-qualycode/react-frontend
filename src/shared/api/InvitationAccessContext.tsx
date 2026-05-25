import { createContext, useContext, type ReactNode } from 'react'
import type { InvitationAccess } from '@/shared/api/invitationAccess'

const InvitationAccessContext = createContext<InvitationAccess | null>(null)

type Props = {
  value: InvitationAccess | null
  children: ReactNode
}

export function InvitationAccessProvider({ value, children }: Props) {
  return (
    <InvitationAccessContext.Provider value={value}>{children}</InvitationAccessContext.Provider>
  )
}

export function useInvitationAccess(): InvitationAccess | null {
  return useContext(InvitationAccessContext)
}

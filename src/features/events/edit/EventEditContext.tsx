import { createContext, useContext, type ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { Event } from '@/shared/types/api'

type EventEditContextValue = {
  eventId: string
  event: Event
  eventQuery: UseQueryResult<Event, Error>
}

const EventEditContext = createContext<EventEditContextValue | null>(null)

export function EventEditProvider({
  value,
  children,
}: {
  value: EventEditContextValue
  children: ReactNode
}) {
  return <EventEditContext.Provider value={value}>{children}</EventEditContext.Provider>
}

export function useEventEditContext() {
  const ctx = useContext(EventEditContext)
  if (!ctx) {
    throw new Error('useEventEditContext must be used within EventEditProvider')
  }
  return ctx
}

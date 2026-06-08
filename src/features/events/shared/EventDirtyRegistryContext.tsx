import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type DirtyRegistryContextValue = {
  anyDirty: boolean
  setDirty: (key: string, dirty: boolean) => void
  discardAll: () => void
  registerDiscard: (key: string, discard: () => void) => void
  unregisterDiscard: (key: string) => void
}

const EventDirtyRegistryContext = createContext<DirtyRegistryContextValue | null>(null)

export function EventDirtyRegistryProvider({ children }: { children: ReactNode }) {
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const discardFnsRef = useRef(new Map<string, () => void>())

  const setDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((prev) => {
      const next = new Set(prev)
      if (dirty) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const registerDiscard = useCallback((key: string, discard: () => void) => {
    discardFnsRef.current.set(key, discard)
  }, [])

  const unregisterDiscard = useCallback((key: string) => {
    discardFnsRef.current.delete(key)
  }, [])

  const discardAll = useCallback(() => {
    for (const fn of discardFnsRef.current.values()) {
      fn()
    }
    setDirtyKeys(new Set())
  }, [])

  const value = useMemo(
    () => ({
      anyDirty: dirtyKeys.size > 0,
      setDirty,
      discardAll,
      registerDiscard,
      unregisterDiscard,
    }),
    [dirtyKeys, setDirty, discardAll, registerDiscard, unregisterDiscard],
  )

  return (
    <EventDirtyRegistryContext.Provider value={value}>{children}</EventDirtyRegistryContext.Provider>
  )
}

export function useEventDirtyRegistry() {
  const ctx = useContext(EventDirtyRegistryContext)
  if (!ctx) {
    throw new Error('useEventDirtyRegistry must be used within EventDirtyRegistryProvider')
  }
  return ctx
}

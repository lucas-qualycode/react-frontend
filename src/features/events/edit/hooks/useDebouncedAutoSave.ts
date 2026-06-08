import { useEffect, useRef } from 'react'

type UseDebouncedAutoSaveOptions = {
  delayMs?: number
  enabled?: boolean
}

export function useDebouncedAutoSave(
  save: () => Promise<void>,
  isDirty: boolean,
  revision: unknown,
  options?: UseDebouncedAutoSaveOptions,
) {
  const saveRef = useRef(save)
  saveRef.current = save
  const inFlightRef = useRef(false)
  const delayMs = options?.delayMs ?? 800
  const enabled = options?.enabled ?? true

  useEffect(() => {
    if (!enabled || !isDirty) return
    const timer = window.setTimeout(() => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      void saveRef.current().finally(() => {
        inFlightRef.current = false
      })
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [enabled, isDirty, delayMs, revision])
}

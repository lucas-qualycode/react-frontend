import { createContext, useContext, type ReactNode } from 'react'

import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'

const Context = createContext<SettingsOutletContext | null>(null)

export function SettingsLayoutOutletProvider({
  value,
  children,
}: {
  value: SettingsOutletContext
  children: ReactNode
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useSettingsOutletContext(): SettingsOutletContext {
  const v = useContext(Context)
  if (!v) throw new Error('useSettingsOutletContext must be used within SettingsLayoutOutletProvider')
  return v
}

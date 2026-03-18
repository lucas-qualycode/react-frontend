import { useEffect, useState, type ReactNode } from 'react'
import { ConfigProvider } from 'antd'
import { lightTheme, darkTheme } from '@/app/antdTheme'

export function AntdThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setDark(m.matches)
    m.addEventListener('change', handler)
    return () => m.removeEventListener('change', handler)
  }, [])
  return (
    <ConfigProvider theme={dark ? darkTheme : lightTheme}>
      {children}
    </ConfigProvider>
  )
}

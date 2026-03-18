import { Flex, Spin, theme } from 'antd'
import { useStore } from 'zustand'
import { screenLoaderStore } from '@/shared/stores/screenLoaderStore'

export function ScreenLoader() {
  const visible = useStore(screenLoaderStore, (s) => s.visible)
  const { token } = theme.useToken()
  if (!visible) return null
  return (
    <Flex
      align="center"
      justify="center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        backgroundColor: token.colorBgMask ?? 'rgba(0,0,0,0.45)',
      }}
      aria-busy
      aria-live="polite"
    >
      <Spin size="large" aria-label="Loading" />
    </Flex>
  )
}

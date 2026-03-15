import { useStore } from 'zustand'
import { screenLoaderStore } from '@/shared/stores/screenLoaderStore'

export function ScreenLoader() {
  const visible = useStore(screenLoaderStore, (s) => s.visible)
  if (!visible) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      aria-busy
      aria-live="polite"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

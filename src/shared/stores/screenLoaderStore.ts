import { create } from 'zustand'

interface ScreenLoaderState {
  visible: boolean
  show: () => void
  hide: () => void
}

export const screenLoaderStore = create<ScreenLoaderState>((set) => ({
  visible: false,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}))

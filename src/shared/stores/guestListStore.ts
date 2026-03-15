import { create } from 'zustand'

const STORAGE_PREFIX = 'guestListToken_'

function getStoredToken(eventId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(STORAGE_PREFIX + eventId)
}

function setStoredToken(eventId: string, token: string): void {
  sessionStorage.setItem(STORAGE_PREFIX + eventId, token)
}

function clearStoredToken(eventId: string): void {
  sessionStorage.removeItem(STORAGE_PREFIX + eventId)
}

const GUEST_LIST_PATH = /\/user-products|\/attendees/

function getEventIdFromUrl(url: string): string | null {
  const m = url.match(/(?:^|\/)events\/([^/?#]+)\/(?:user-products|attendees)/)
    ?? url.match(/(?:^|\/)api\/events\/([^/?#]+)\//)
  if (m) return m[1]
  if (GUEST_LIST_PATH.test(url)) {
    return guestListStore.getState().currentEventId
  }
  return null
}

interface GuestListState {
  currentEventId: string | null
  getToken: (eventId: string) => string | null
  setToken: (eventId: string, token: string) => void
  clearToken: (eventId: string) => void
  setCurrentEventId: (eventId: string) => void
  getTokenForRequest: (url: string) => string | null
}

export const guestListStore = create<GuestListState>((set, get) => ({
  currentEventId: null,
  getToken: (eventId: string) => getStoredToken(eventId),
  setToken: (eventId: string, token: string) => {
    setStoredToken(eventId, token)
    set({ currentEventId: eventId })
  },
  clearToken: (eventId: string) => {
    clearStoredToken(eventId)
    if (get().currentEventId === eventId) {
      set({ currentEventId: null })
    }
  },
  setCurrentEventId: (eventId: string) => set({ currentEventId: eventId }),
  getTokenForRequest: (url: string) => {
    const eventId = getEventIdFromUrl(url)
    if (!eventId) return null
    return getStoredToken(eventId)
  },
}))

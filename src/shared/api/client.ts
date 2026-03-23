import { getAuth } from 'firebase/auth'
import { app } from '@/app/firebase'

function getBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (typeof url === 'string' && url.length > 0) return url.replace(/\/$/, '')
  return ''
}

const firebaseAuth = getAuth(app)

let authGetter: () => Promise<string | null> = async () => null
let guestListGetter: (url: string) => string | null = () => null

export function setApiAuthGetter(getter: () => Promise<string | null>): void {
  authGetter = getter
}

export function setApiGuestListGetter(getter: (url: string) => string | null): void {
  guestListGetter = getter
}

async function resolveIdToken(): Promise<string | null> {
  const fromGetter = await authGetter()
  if (fromGetter) return fromGetter
  const u = firebaseAuth.currentUser
  if (u) return u.getIdToken()
  return null
}

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const base = getBaseUrl()
  const pathNorm = path.startsWith('/') ? path.slice(1) : path
  const url = base ? `${base}/${pathNorm}` : `/${pathNorm}`
  const token = await resolveIdToken()
  const guestToken = guestListGetter(url)
  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else if (guestToken) {
    headers.set('X-Guest-List-Token', guestToken)
  }
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401) {
    const event = new CustomEvent('api:unauthorized', { detail: { url, status: 401 } })
    window.dispatchEvent(event)
  }
  return res
}

export function getApiBaseUrl(): string {
  return getBaseUrl()
}

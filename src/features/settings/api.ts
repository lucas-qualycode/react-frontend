import { fetchApi } from '@/shared/api/client'
import type { CreateUserProfileInput, UpdateUserProfileInput, UserProfile } from './types'

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const res = await fetchApi(`users/${uid}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to load profile')
  return res.json() as Promise<UserProfile>
}

export async function createUserProfile(data: CreateUserProfileInput): Promise<UserProfile> {
  const res = await fetchApi('users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create profile')
  return res.json() as Promise<UserProfile>
}

export async function updateUserProfile(
  uid: string,
  data: UpdateUserProfileInput
): Promise<UserProfile> {
  const res = await fetchApi(`users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json() as Promise<UserProfile>
}

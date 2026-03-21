import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUserProfile, getUserProfile, updateUserProfile } from './api'
import type { CreateUserProfileInput, UpdateUserProfileInput, UserProfile } from './types'

const PROFILE_QUERY_KEY = 'userProfile'

export function useUserProfile(
  uid: string | null | undefined,
  getCreatePayload: (() => CreateUserProfileInput) | null
) {
  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, uid],
    queryFn: async (): Promise<UserProfile> => {
      const id = uid!
      const existing = await getUserProfile(id)
      if (existing) return existing
      const payload = getCreatePayload?.()
      if (!payload) throw new Error('Cannot create profile')
      await createUserProfile(payload)
      const next = await getUserProfile(id)
      if (!next) throw new Error('Failed to load profile after create')
      return next
    },
    enabled: !!uid,
  })
}

export function useUpdateUserProfile(uid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateUserProfileInput) => updateUserProfile(uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, uid] })
    },
  })
}

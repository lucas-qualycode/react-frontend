import type { UseMutationResult } from '@tanstack/react-query'
import { Modal } from 'antd'
import type { User as FirebaseUser } from 'firebase/auth'
import type { UpdateUserProfileInput, UserProfile } from '@/features/settings/types'

type ModalHookApi = ReturnType<typeof Modal.useModal>[0]

export type SettingsOutletContext = {
  user: FirebaseUser | null
  profile: UserProfile | undefined
  updateMutation: UseMutationResult<UserProfile, Error, UpdateUserProfileInput, unknown>
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>
  modalApi: ModalHookApi
}

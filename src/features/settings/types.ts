export interface UserPreferences {
  notifications: boolean
  language: string
  timezone: string
}

export interface UserProfile {
  id: string
  email: string
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  phoneNumber: string | null
  preferences: UserPreferences
}

export interface CreateUserProfileInput {
  id: string
  email: string
  displayName?: string | null
  photoURL?: string | null
  emailVerified?: boolean
  phoneNumber?: string | null
  preferences?: UserPreferences
}

export interface UpdateUserProfileInput {
  displayName?: string | null
  photoURL?: string | null
  phoneNumber?: string | null
  preferences?: Partial<UserPreferences>
}

export type ThemeMode = 'system' | 'light' | 'dark'
export type DensityPref = 'default' | 'compact' | 'comfortable'
export type FontSizePref = 'standard' | 'large'
export type ReducedMotionPref = 'system' | 'reduce' | 'full'

export interface UserPreferences {
  notifications: boolean
  language: string
  timezone: string
  themeMode: ThemeMode
  density: DensityPref
  fontSize: FontSizePref
  reducedMotion: ReducedMotionPref
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
  email?: string | null
  emailVerified?: boolean | null
  displayName?: string | null
  photoURL?: string | null
  phoneNumber?: string | null
  preferences?: Partial<UserPreferences>
}

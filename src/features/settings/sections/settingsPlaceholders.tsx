import { PlaceholderSettingsSection } from '@/features/settings/sections/PlaceholderSettingsSection'

export function PrivacySettingsSection() {
  return (
    <PlaceholderSettingsSection
      title="Privacy"
      description="Control who can see your profile and activity."
    />
  )
}

export function AppearanceSettingsSection() {
  return (
    <PlaceholderSettingsSection
      title="Appearance"
      description="Theme, font size, and display options."
    />
  )
}

export function SecurityPlaceholderSettingsSection() {
  return (
    <PlaceholderSettingsSection
      title="Security"
      description="Password, two-factor authentication, and sessions."
    />
  )
}

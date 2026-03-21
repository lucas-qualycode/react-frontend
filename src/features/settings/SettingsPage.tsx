import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import {
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Flex,
  Form,
  Input,
  Layout,
  Menu,
  message,
  Modal,
  Select,
  Spin,
  Switch,
  Typography,
  Upload,
} from 'antd'
import {
  BellOutlined,
  BgColorsOutlined,
  CameraOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '@/app/auth/AuthContext'
import { app } from '@/app/firebase'
import { useUserProfile, useUpdateUserProfile } from '@/features/settings/hooks'
import type { UpdateUserProfileInput, UserProfile } from '@/features/settings/types'

const storage = getStorage(app)
storage.maxUploadRetryTime = 15_000
storage.maxOperationRetryTime = 15_000

const { Content } = Layout
const { Text } = Typography

type SettingsSection = 'profile' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'security'

const SETTINGS_MENU_ITEMS: { key: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
  { key: 'notifications', label: 'Notifications', icon: <BellOutlined /> },
  { key: 'privacy', label: 'Privacy', icon: <SafetyOutlined /> },
  { key: 'appearance', label: 'Appearance', icon: <BgColorsOutlined /> },
  { key: 'language', label: 'Language & region', icon: <GlobalOutlined /> },
  { key: 'security', label: 'Security', icon: <LockOutlined /> },
]

type ProfileFormValues = {
  displayName: string
  phoneNumber: string
}

type NotificationsFormValues = {
  notifications: boolean
}

type LanguageFormValues = {
  language: string
  timezone: string
}

function toProfileFormValues(p: UserProfile | undefined): Partial<ProfileFormValues> | undefined {
  if (!p) return undefined
  return {
    displayName: p.displayName ?? '',
    phoneNumber: p.phoneNumber ?? '',
  }
}

export function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const getCreatePayload = user
    ? () => ({
        id: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        emailVerified: user.emailVerified,
      })
    : null
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile(
    user?.uid,
    getCreatePayload
  )
  const updateMutation = useUpdateUserProfile(user?.uid ?? '')
  const [profileForm] = Form.useForm<ProfileFormValues>()
  const [notificationsForm] = Form.useForm<NotificationsFormValues>()
  const [languageForm] = Form.useForm<LanguageFormValues>()
  const [section, setSection] = useState<SettingsSection>('profile')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoRemoving, setPhotoRemoving] = useState(false)
  const [photoEditOpen, setPhotoEditOpen] = useState(false)
  const [modalApi, modalContextHolder] = Modal.useModal()

  useEffect(() => {
    const values = toProfileFormValues(profile)
    if (values) profileForm.setFieldsValue(values)
  }, [profile, profileForm])

  useEffect(() => {
    if (profile) {
      notificationsForm.setFieldsValue({ notifications: profile.preferences.notifications })
    }
  }, [profile, notificationsForm])

  useEffect(() => {
    if (profile) {
      languageForm.setFieldsValue({
        language: profile.preferences.language,
        timezone: profile.preferences.timezone,
      })
    }
  }, [profile, languageForm])

  async function onFinishProfile(values: ProfileFormValues) {
    const payload: UpdateUserProfileInput = {
      displayName: values.displayName || null,
      phoneNumber: values.phoneNumber || null,
    }
    try {
      await updateMutation.mutateAsync(payload)
      await updateProfile({
        displayName: payload.displayName ?? '',
      })
      message.success('Profile saved.')
    } catch {
      message.error('Could not save. Please try again.')
    }
  }

  async function handleRemovePhoto() {
    setPhotoRemoving(true)
    try {
      await updateMutation.mutateAsync({ photoURL: null })
      await updateProfile({ photoURL: '' })
      message.success('Photo removed.')
    } catch (err) {
      const text =
        err instanceof Error ? err.message : 'Could not remove photo. Please try again.'
      message.error(text)
    } finally {
      setPhotoRemoving(false)
    }
  }

  function requestRemovePhoto() {
    if (!profile?.photoURL) return
    modalApi.confirm({
      title: 'Remove profile photo?',
      content: 'This will permanently remove your current profile photo.',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        if (photoRemoving) return
        await handleRemovePhoto()
      },
    })
  }

  async function customPhotoRequest(
    options: Parameters<NonNullable<ComponentProps<typeof Upload>['customRequest']>>[0]
  ) {
    const file = options.file
    if (!file || !user || !(file instanceof File)) return
    if (!file.type.startsWith('image/')) {
      message.error('Please select an image file.')
      options.onError?.(new Error('Not an image'))
      return
    }
    setPhotoUploading(true)
    try {
      const path = `avatars/${user.uid}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, path)
      
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)
      await updateMutation.mutateAsync({ photoURL })
      await updateProfile({ photoURL })
      message.success('Photo updated.')
      options.onSuccess?.(photoURL)
    } catch (err) {
      let text = 'Could not upload photo. Please try again.'
      if (err instanceof Error) {
        text = err.message
      }
      message.error(text)
      options.onError?.(err instanceof Error ? err : new Error(text))
    } finally {
      setPhotoUploading(false)
    }
  }

  async function onFinishNotifications(values: NotificationsFormValues) {
    if (!profile) return
    try {
      await updateMutation.mutateAsync({
        preferences: {
          notifications: values.notifications,
          language: profile.preferences.language,
          timezone: profile.preferences.timezone,
        },
      })
      message.success('Notifications saved.')
    } catch {
      message.error('Could not save. Please try again.')
    }
  }

  async function onFinishLanguage(values: LanguageFormValues) {
    if (!profile) return
    try {
      await updateMutation.mutateAsync({
        preferences: {
          notifications: profile.preferences.notifications,
          language: values.language,
          timezone: values.timezone,
        },
      })
      message.success('Language & region saved.')
    } catch {
      message.error('Could not save. Please try again.')
    }
  }

  const sectionLabel = SETTINGS_MENU_ITEMS.find((i) => i.key === section)?.label ?? 'Settings'

  if (profileLoading && !profile) {
    return (
      <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
        <Breadcrumb style={{ marginBottom: 24 }} items={[{ title: 'Settings' }, { title: sectionLabel }]} />
        <Spin size="large" />
      </Content>
    )
  }

  if (profileError) {
    return (
      <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
        <Breadcrumb style={{ marginBottom: 24 }} items={[{ title: 'Settings' }, { title: sectionLabel }]} />
        <Typography.Text type="danger">Failed to load profile.</Typography.Text>
      </Content>
    )
  }

  function renderSectionContent() {
    if (section === 'profile') {
      const photoURL = profile?.photoURL ?? undefined
      const displayName = profile?.displayName?.trim()
      const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U'
      return (
        <Card title="Profile">
          {modalContextHolder}
          <Flex gap={40} align="flex-start" wrap="wrap">
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={onFinishProfile}
              initialValues={{
                displayName: '',
                phoneNumber: '',
              }}
              style={{ flex: 1, minWidth: 280 }}
            >
              <Form.Item name="displayName" label="Name">
                <Input placeholder="Your name" />
              </Form.Item>
              <Form.Item name="phoneNumber" label="Phone">
                <Input placeholder="+1 234 567 8900" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                  Save
                </Button>
              </Form.Item>
            </Form>
            <Flex vertical align="center" flex="none" gap={8}>
              <Avatar
                src={photoURL || undefined}
                style={{ width: 160, height: 160, borderRadius: '50%', fontSize: 64 }}
              >
                {!photoURL && initial}
              </Avatar>
              <Button type="link" onClick={() => setPhotoEditOpen(true)} style={{ padding: 0 }}>
                Edit
              </Button>
              <Modal
                title="Profile photo"
                open={photoEditOpen}
                onCancel={() => setPhotoEditOpen(false)}
                footer={null}
                destroyOnClose
              >
                <Flex vertical align="center" gap={24}>
                  <div
                    style={{
                      width: 240,
                      height: 240,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'var(--ant-color-fill-quaternary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt="Profile"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Typography.Text style={{ fontSize: 96, color: 'var(--ant-color-text-tertiary)' }}>
                        {initial}
                      </Typography.Text>
                    )}
                  </div>
                  <Flex gap={12} justify="center">
                    <Upload
                      showUploadList={false}
                      accept="image/*"
                      customRequest={customPhotoRequest}
                    >
                      <Button
                        icon={photoUploading ? <Spin size="small" /> : <CameraOutlined />}
                        loading={photoUploading}
                        disabled={photoUploading}
                      >
                        {photoURL ? 'Change' : 'Upload'}
                      </Button>
                    </Upload>
                    {photoURL && (
                      <Button
                        danger
                        icon={photoRemoving ? <Spin size="small" /> : <DeleteOutlined />}
                        loading={photoRemoving}
                        disabled={photoRemoving}
                        onClick={requestRemovePhoto}
                      >
                        Remove
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </Modal>
            </Flex>
          </Flex>
        </Card>
      )
    }
    if (section === 'notifications') {
      return (
        <Card title="Notifications">
          <Form
            form={notificationsForm}
            layout="vertical"
            onFinish={onFinishNotifications}
            initialValues={{ notifications: true }}
          >
            <Form.Item
              name="notifications"
              label="Email and in-app notifications"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Save
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    }
    if (section === 'language') {
      return (
        <Card title="Language & region">
          <Form
            form={languageForm}
            layout="vertical"
            onFinish={onFinishLanguage}
            initialValues={{ language: 'pt-BR', timezone: 'UTC-3' }}
          >
            <Form.Item name="language" label="Language">
              <Select
                options={[
                  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </Form.Item>
            <Form.Item name="timezone" label="Timezone">
              <Select
                options={[
                  { value: 'UTC-3', label: 'UTC-3 (Brasília)' },
                  { value: 'UTC', label: 'UTC' },
                ]}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Save
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    }
    const placeholders: Record<SettingsSection, string> = {
      profile: '',
      notifications: '',
      privacy: 'Control who can see your profile and activity.',
      appearance: 'Theme, font size, and display options.',
      language: '',
      security: 'Password, two-factor authentication, and sessions.',
    }
    return (
      <Card title={SETTINGS_MENU_ITEMS.find((i) => i.key === section)?.label}>
        <Text type="secondary">{placeholders[section]}</Text>
      </Card>
    )
  }

  return (
    <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Flex gap={32} align="flex-start">
        <Flex flex={1} vertical style={{ minWidth: 0 }}>
          <Breadcrumb
            style={{ marginBottom: 24 }}
            items={[{ title: 'Settings' }, { title: sectionLabel }]}
          />
          {renderSectionContent()}
        </Flex>
        <Menu
          selectedKeys={[section]}
          onSelect={({ key }) => setSection(key as SettingsSection)}
          mode="vertical"
          style={{ width: 220, flexShrink: 0 }}
          items={SETTINGS_MENU_ITEMS.map(({ key, label, icon }) => ({ key, label, icon }))}
        />
      </Flex>
    </Content>
  )
}

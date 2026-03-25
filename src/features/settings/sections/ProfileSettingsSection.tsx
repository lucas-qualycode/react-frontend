import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Input,
  message,
  Modal,
  Spin,
  Typography,
  Upload,
  theme,
} from 'antd'
import { CameraOutlined, DeleteOutlined } from '@ant-design/icons'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SettingsOutletContext } from '@/features/settings/settingsOutletContext'
import { settingsStorage } from '@/features/settings/storage'
import type { UpdateUserProfileInput, UserProfile } from '@/features/settings/types'

type ProfileFormValues = {
  displayName: string
  phoneNumber: string
}

function toProfileFormValues(p: UserProfile | undefined): Partial<ProfileFormValues> | undefined {
  if (!p) return undefined
  return {
    displayName: p.displayName ?? '',
    phoneNumber: p.phoneNumber ?? '',
  }
}

export function ProfileSettingsSection() {
  const { t } = useTranslation()
  const { user, profile, updateMutation, updateProfile, modalApi } =
    useOutletContext<SettingsOutletContext>()
  const [profileForm] = Form.useForm<ProfileFormValues>()
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoRemoving, setPhotoRemoving] = useState(false)
  const [photoEditOpen, setPhotoEditOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [editHover, setEditHover] = useState(false)
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const stackProfileLayout = screens.md === false

  useEffect(() => {
    const values = toProfileFormValues(profile)
    if (values) profileForm.setFieldsValue(values)
  }, [profile, profileForm])

  async function onFinishProfile(values: ProfileFormValues) {
    const payload: UpdateUserProfileInput = {
      displayName: values.displayName || null,
      phoneNumber: values.phoneNumber || null,
    }
    setProfileSaving(true)
    try {
      await updateMutation.mutateAsync(payload)
      await updateProfile({
        displayName: payload.displayName ?? '',
      })
      message.success(t('settings.profile.saved'))
    } catch {
      message.error(t('settings.saveError'))
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleRemovePhoto() {
    setPhotoRemoving(true)
    try {
      await updateMutation.mutateAsync({ photoURL: null })
      await updateProfile({ photoURL: '' })
      message.success(t('settings.profile.photoRemoved'))
    } catch (err) {
      const text =
        err instanceof Error ? err.message : t('settings.profile.photoRemoveError')
      message.error(text)
    } finally {
      setPhotoRemoving(false)
    }
  }

  function requestRemovePhoto() {
    if (!profile?.photoURL) return
    modalApi.confirm({
      title: t('settings.profile.removePhotoModalTitle'),
      content: t('settings.profile.removePhotoModalBody'),
      okText: t('settings.profile.removePhotoOk'),
      okType: 'danger',
      cancelText: t('auth.signIn.cancel'),
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
      message.error(t('settings.profile.notImageFile'))
      options.onError?.(new Error('Not an image'))
      return
    }
    setPhotoUploading(true)
    try {
      const path = `avatars/${user.uid}/${Date.now()}_${file.name}`
      const storageRef = ref(settingsStorage, path)
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)
      await updateMutation.mutateAsync({ photoURL })
      await updateProfile({ photoURL })
      message.success(t('settings.profile.photoUpdated'))
      options.onSuccess?.(photoURL)
    } catch (err) {
      let text = t('settings.profile.photoUploadError')
      if (err instanceof Error) {
        text = err.message
      }
      message.error(text)
      options.onError?.(err instanceof Error ? err : new Error(text))
    } finally {
      setPhotoUploading(false)
    }
  }

  const photoURL = profile?.photoURL ?? undefined
  const displayName = profile?.displayName?.trim()
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U'

  return (
    <Card title={t('settings.profile.cardTitle')}>
      <Flex
        gap={stackProfileLayout ? 24 : 40}
        align={stackProfileLayout ? 'center' : 'flex-start'}
        vertical={stackProfileLayout}
        wrap={stackProfileLayout ? false : 'wrap'}
      >
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={onFinishProfile}
          initialValues={{
            displayName: '',
            phoneNumber: '',
          }}
          style={{
            flex: stackProfileLayout ? undefined : 1,
            minWidth: stackProfileLayout ? undefined : 200,
            width: stackProfileLayout ? '100%' : undefined,
            order: stackProfileLayout ? 2 : 0,
          }}
        >
          <Form.Item name="displayName" label={t('settings.profile.nameLabel')}>
            <Input placeholder={t('settings.profile.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="phoneNumber" label={t('settings.profile.phoneLabel')}>
            <Input placeholder={t('settings.profile.phonePlaceholder')} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={profileSaving}>
              {t('settings.save')}
            </Button>
          </Form.Item>
        </Form>
        <Flex
          vertical
          align="center"
          flex="none"
          gap={8}
          style={{ order: stackProfileLayout ? 1 : 0 }}
        >
          <Avatar
            src={photoURL || undefined}
            style={{ width: 160, height: 160, borderRadius: '50%', fontSize: 64 }}
          >
            {!photoURL && initial}
          </Avatar>
          <Button
            type="text"
            className="profile-avatar-edit"
            onClick={() => setPhotoEditOpen(true)}
            onMouseEnter={() => setEditHover(true)}
            onMouseLeave={() => setEditHover(false)}
            style={{
              padding: 0,
              height: 'auto',
              color: editHover ? token.colorPrimary : token.colorTextSecondary,
            }}
          >
            {t('settings.profile.editPhoto')}
          </Button>
          <Modal
            title={t('settings.profile.photoModalTitle')}
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
                    alt={t('settings.profile.profileImageAlt')}
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
                    {photoURL ? t('settings.profile.changePhoto') : t('settings.profile.uploadPhoto')}
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
                    {t('settings.profile.removePhoto')}
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

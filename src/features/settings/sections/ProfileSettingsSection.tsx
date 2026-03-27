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
  Typography,
  theme,
} from 'antd'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useTranslation } from 'react-i18next'
import { useSettingsOutletContext } from '@/features/settings/SettingsLayoutOutletContext'
import { settingsStorage } from '@/features/settings/storage'
import type { UpdateUserProfileInput, UserProfile } from '@/features/settings/types'
import { ImageEditModal } from '@/shared/components/ImageEditModal'

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
  const { user, profile, updateMutation, updateProfile } = useSettingsOutletContext()
  const [profileForm] = Form.useForm<ProfileFormValues>()
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
    try {
      await updateMutation.mutateAsync({ photoURL: null })
      await updateProfile({ photoURL: '' })
      message.success(t('settings.profile.photoRemoved'))
    } catch (err) {
      const text =
        err instanceof Error ? err.message : t('settings.profile.photoRemoveError')
      message.error(text)
    }
  }

  async function performPhotoUpload(file: File) {
    if (!user) return
    const path = `avatars/${user.uid}/${Date.now()}_${file.name}`
    const storageRef = ref(settingsStorage, path)
    await uploadBytes(storageRef, file)
    const photoURL = await getDownloadURL(storageRef)
    try {
      await updateMutation.mutateAsync({ photoURL })
      await updateProfile({ photoURL })
      message.success(t('settings.profile.photoUpdated'))
    } catch (err) {
      let text = t('settings.profile.photoUploadError')
      if (err instanceof Error) {
        text = err.message
      }
      message.error(text)
      throw err instanceof Error ? err : new Error(text)
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
          <ImageEditModal
            open={photoEditOpen}
            onClose={() => setPhotoEditOpen(false)}
            imageUrl={photoURL}
            imageAlt={t('settings.profile.profileImageAlt')}
            variant="circle"
            previewFallback={
              <Typography.Text style={{ fontSize: 96, color: 'var(--ant-color-text-tertiary)' }}>
                {initial}
              </Typography.Text>
            }
            labels={{
              modalTitle: t('settings.profile.photoModalTitle'),
              changePhoto: t('settings.profile.changePhoto'),
              uploadPhoto: t('settings.profile.uploadPhoto'),
              removePhoto: t('settings.profile.removePhoto'),
              notImageFile: t('settings.profile.notImageFile'),
              removeModalTitle: t('settings.profile.removePhotoModalTitle'),
              removeModalBody: t('settings.profile.removePhotoModalBody'),
              removeModalOk: t('settings.profile.removePhotoOk'),
              cancel: t('auth.signIn.cancel'),
            }}
            performUpload={performPhotoUpload}
            onRemove={handleRemovePhoto}
          />
        </Flex>
      </Flex>
    </Card>
  )
}

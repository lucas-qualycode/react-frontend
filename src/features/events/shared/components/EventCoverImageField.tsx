import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button, Form, Input, Typography, message, theme } from 'antd'
import { getDownloadURL, ref as storageRefFn, uploadBytes } from 'firebase/storage'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthContext'
import { patchEventIdentity } from '@/features/events/api'
import { URL_REGEX } from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import { settingsStorage } from '@/features/settings/storage'
import { ImageEditModal } from '@/shared/components/ImageEditModal'

type EventCoverImageFieldProps = {
  eventId: string
}

export function EventCoverImageField({ eventId }: EventCoverImageFieldProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { token } = theme.useToken()
  const form = Form.useFormInstance<EventFormValues>()
  const [imageEditOpen, setImageEditOpen] = useState(false)
  const [editImageHover, setEditImageHover] = useState(false)
  const watchedImageUrl = Form.useWatch('imageURL', form) as string | undefined

  const urlRule = useMemo(
    () => ({
      validator: async (_: unknown, value: string) => {
        const v = value?.trim() ?? ''
        if (!v) return
        if (!URL_REGEX.test(v)) throw new Error(t('events.form.urlInvalid'))
      },
    }),
    [t],
  )

  const coverPreviewSrc = watchedImageUrl?.trim() ? watchedImageUrl.trim() : ''

  async function performEventImageUpload(file: File) {
    if (!user) return
    const path = `event-images/${user.uid}/${eventId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    try {
      const storageRef = storageRefFn(settingsStorage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      const updated = await patchEventIdentity(eventId, { imageURL: url })
      queryClient.setQueryData(['event', eventId], updated)
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      form.setFieldsValue({ imageURL: updated.imageURL ?? '' })
      message.success(t('events.form.imageUpdated'))
    } catch (err) {
      let text = t('events.form.imageUploadError')
      if (err instanceof Error) {
        text = err.message
      }
      message.error(text)
      throw err instanceof Error ? err : new Error(text)
    }
  }

  async function handleRemoveEventImage() {
    try {
      const updated = await patchEventIdentity(eventId, { imageURL: null })
      queryClient.setQueryData(['event', eventId], updated)
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      form.setFieldsValue({ imageURL: updated.imageURL ?? '' })
      message.success(t('events.form.imageRemoved'))
    } catch (err) {
      let text = t('events.form.imageUploadError')
      if (err instanceof Error) {
        text = err.message
      }
      message.error(text)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <Form.Item name="imageURL" hidden rules={[urlRule]}>
        <Input />
      </Form.Item>
      <Typography.Title level={5} style={{ marginTop: 16, marginBottom: coverPreviewSrc ? 12 : 4 }}>
        {t('events.form.coverImageTitle')}
      </Typography.Title>
      {coverPreviewSrc ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '2 / 1',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--ant-color-border)',
            background: 'var(--ant-color-bg-elevated)',
          }}
        >
          <img
            src={coverPreviewSrc}
            alt={t('events.form.eventImageAlt')}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      ) : null}
      {!coverPreviewSrc ? (
        <Button
          type="link"
          onClick={() => setImageEditOpen(true)}
          onMouseEnter={() => setEditImageHover(true)}
          onMouseLeave={() => setEditImageHover(false)}
          style={{
            padding: 0,
            height: 'auto',
            display: 'block',
            marginTop: 0,
            marginBottom: 8,
            textAlign: 'left',
            fontWeight: 700,
            whiteSpace: 'normal',
            color: editImageHover ? token.colorPrimary : token.colorTextSecondary,
          }}
        >
          {t('events.form.coverImageEmptyHint')}
        </Button>
      ) : null}
      {coverPreviewSrc ? (
        <Button
          type="text"
          onClick={() => setImageEditOpen(true)}
          onMouseEnter={() => setEditImageHover(true)}
          onMouseLeave={() => setEditImageHover(false)}
          style={{
            padding: 0,
            height: 'auto',
            marginTop: 8,
            color: editImageHover ? token.colorPrimary : token.colorTextSecondary,
          }}
        >
          {t('events.form.imageEdit')}
        </Button>
      ) : null}
      <ImageEditModal
        open={imageEditOpen}
        onClose={() => setImageEditOpen(false)}
        imageUrl={coverPreviewSrc || undefined}
        imageAlt={t('events.form.eventImageAlt')}
        variant="roundedRect"
        previewFallback={
          <Typography.Text type="secondary">{t('events.detail.noImage')}</Typography.Text>
        }
        labels={{
          modalTitle: t('events.form.imageModalTitle'),
          changePhoto: t('events.form.changeImage'),
          uploadPhoto: t('events.form.uploadImage'),
          removePhoto: t('events.form.removeImage'),
          notImageFile: t('events.form.imageNotImageFile'),
          removeModalTitle: t('events.form.removeImageModalTitle'),
          removeModalBody: t('events.form.removeImageModalBody'),
          removeModalOk: t('events.form.removeImageOk'),
          cancel: t('events.tags.cancel'),
        }}
        performUpload={performEventImageUpload}
        onRemove={handleRemoveEventImage}
      />
    </div>
  )
}

import type { ReactNode } from 'react'
import { useState } from 'react'
import { App, Button, Flex, Modal, Spin, Upload, theme } from 'antd'
import { CameraOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'

export type ImageEditModalLabels = {
  modalTitle: string
  changePhoto: string
  uploadPhoto: string
  removePhoto: string
  notImageFile: string
  removeModalTitle: string
  removeModalBody: string
  removeModalOk: string
  cancel: string
}

export type ImageEditModalProps = {
  open: boolean
  onClose: () => void
  imageUrl?: string
  imageAlt: string
  labels: ImageEditModalLabels
  performUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
  variant: 'circle' | 'roundedRect'
  previewFallback?: ReactNode
}

export function ImageEditModal({
  open,
  onClose,
  imageUrl,
  imageAlt,
  labels,
  performUpload,
  onRemove,
  variant,
  previewFallback,
}: ImageEditModalProps) {
  const { modal, message } = App.useApp()
  const { token } = theme.useToken()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeHovered, setRemoveHovered] = useState(false)

  const customRequest: NonNullable<UploadProps['customRequest']> = async (options) => {
    const file = options.file
    if (!file || !(file instanceof File)) return
    if (!file.type.startsWith('image/')) {
      message.error(labels.notImageFile)
      options.onError?.(new Error('Not an image'))
      return
    }
    setUploading(true)
    try {
      await performUpload(file)
      options.onSuccess?.({}, new XMLHttpRequest())
    } catch (err) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setUploading(false)
    }
  }

  function requestRemove() {
    if (!imageUrl) return
    modal.confirm({
      title: labels.removeModalTitle,
      content: labels.removeModalBody,
      okText: labels.removeModalOk,
      okType: 'danger',
      cancelText: labels.cancel,
      onOk: async () => {
        setRemoving(true)
        try {
          await onRemove()
        } finally {
          setRemoving(false)
        }
      },
    })
  }

  const previewInner =
    variant === 'circle' ? (
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
        {imageUrl ? (
          <img src={imageUrl} alt={imageAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          previewFallback
        )}
      </div>
    ) : (
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--ant-color-fill-quaternary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={imageAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          previewFallback
        )}
      </div>
    )

  return (
    <Modal title={labels.modalTitle} open={open} onCancel={onClose} footer={null} destroyOnClose>
      <Flex vertical align="center" gap={24}>
        {previewInner}
        <Flex gap={12} justify="center">
          <Upload showUploadList={false} accept="image/*" customRequest={customRequest}>
            <Button
              icon={uploading ? <Spin size="small" /> : <CameraOutlined />}
              loading={uploading}
              disabled={uploading}
            >
              {imageUrl ? labels.changePhoto : labels.uploadPhoto}
            </Button>
          </Upload>
          {imageUrl ? (
            <Button
              type="default"
              icon={removing ? <Spin size="small" /> : <DeleteOutlined />}
              loading={removing}
              disabled={removing}
              onClick={requestRemove}
              onMouseEnter={() => setRemoveHovered(true)}
              onMouseLeave={() => setRemoveHovered(false)}
              style={{
                color: token.colorError,
                borderColor: removeHovered ? token.colorError : token.colorErrorBorder,
                backgroundColor: removeHovered ? token.colorErrorBgHover : token.colorErrorBg,
                opacity: removeHovered ? 1 : 0.72,
                transition:
                  'opacity 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
              }}
            >
              {labels.removePhoto}
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </Modal>
  )
}

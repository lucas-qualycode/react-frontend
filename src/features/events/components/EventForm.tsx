import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Collapse,
  Flex,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Space,
  TreeSelect,
  Typography,
  message,
  theme,
} from 'antd'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '@/app/auth/AuthContext'
import { settingsStorage } from '@/features/settings/storage'
import { ImageEditModal } from '@/shared/components/ImageEditModal'
import type { TreeSelectProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useEventTags, useCreateTag } from '../hooks'

import type { Tag as EventTag } from '@/shared/types/api'
import type { CreateEventPayload, UpdateEventPayload } from '../api'

type EventFormValues = {
  name: string
  description: string
  location: string
  location_address: string
  location_link: string
  imageURL: string
  tag_ids: string[]
  is_paid: boolean
  is_online: boolean
}

export type EventFormSubmitMeta = {
  pendingEventImage?: File | null
}

type EventFormProps = {
  mode: 'create' | 'edit'
  eventId?: string
  initialValues: Partial<EventFormValues> & { active?: boolean }
  submitLoading: boolean
  onSubmit: (
    payload: CreateEventPayload | UpdateEventPayload,
    meta?: EventFormSubmitMeta
  ) => Promise<void>
}

const URL_REGEX = /^https?:\/\/[^\s]+$/i

function tagPathLabel(id: string, byId: Map<string, EventTag>): string {
  const parts: string[] = []
  let cur: EventTag | undefined = byId.get(id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    parts.unshift(cur.name)
    cur = cur.parent_tag_id ? byId.get(cur.parent_tag_id) : undefined
  }
  return parts.length > 0 ? parts.join(' / ') : id
}

function toOptionalString(s: string | undefined): string | undefined {
  const v = s?.trim() ?? ''
  return v.length > 0 ? v : undefined
}

function normalizePayload(
  values: EventFormValues,
  mode: 'create' | 'edit',
  active: boolean
): CreateEventPayload | UpdateEventPayload {
  const common = {
    tag_ids: values.tag_ids,
    active,
    is_paid: values.is_paid,
    is_online: values.is_online,
  }

  const base = {
    name: values.name,
    description: toOptionalString(values.description),
    location: toOptionalString(values.location),
    location_address: toOptionalString(values.location_address),
    location_link: toOptionalString(values.location_link),
    imageURL: toOptionalString(values.imageURL),
    ...common,
  }

  if (mode === 'create') {
    const { imageURL: _omitImage, ...rest } = base
    return rest as CreateEventPayload
  }

  const update: UpdateEventPayload = {
    name: base.name,
    description: base.description,
    location: base.location,
    location_address: base.location_address,
    location_link: base.location_link,
    imageURL: base.imageURL,
    tag_ids: base.tag_ids,
    active: base.active,
    is_paid: base.is_paid,
    is_online: base.is_online,
  }
  return update
}

export function EventForm({ mode, eventId, initialValues, submitLoading, onSubmit }: EventFormProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { token } = theme.useToken()
  const [form] = Form.useForm<EventFormValues>()
  const [imageEditOpen, setImageEditOpen] = useState(false)
  const [editImageHover, setEditImageHover] = useState(false)
  const [pendingEventImage, setPendingEventImage] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const watchedImageUrl = Form.useWatch('imageURL', form) as string | undefined
  const { data: tags, isLoading: tagsLoading, refetch: refetchTags } = useEventTags()
  const createTagMutation = useCreateTag()
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [tagForm] = Form.useForm<{ name: string; description?: string; parent_tag_id?: string }>()
  const [venuePanelKey, setVenuePanelKey] = useState<string | undefined>('venue')

  const fieldItemStyle = { marginBottom: 10 } as const
  const panelKeyByField: Record<string, string> = {
    location: 'venue',
    location_address: 'venue',
    location_link: 'venue',
  }

  useEffect(() => {
    form.setFieldsValue({
      name: initialValues.name ?? '',
      description: initialValues.description ?? '',
      location: initialValues.location ?? '',
      location_address: initialValues.location_address ?? '',
      location_link: initialValues.location_link ?? '',
      imageURL: initialValues.imageURL ?? '',
      tag_ids: initialValues.tag_ids ?? [],
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
    })
  }, [form, initialValues])

  useEffect(() => {
    if (!tagModalOpen) {
      tagForm.resetFields()
    }
  }, [tagModalOpen, tagForm])

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  const tagTreeData: TreeSelectProps['treeData'] = useMemo(() => {
    if (!tags?.length) return []
    const byParent = new Map<string | null, EventTag[]>()
    for (const t of tags) {
      const pid = t.parent_tag_id ?? null
      const arr = byParent.get(pid) ?? []
      arr.push(t)
      byParent.set(pid, arr)
    }
    function toNodes(parentId: string | null): NonNullable<TreeSelectProps['treeData']> {
      return (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => {
          const children = toNodes(t.id)
          return {
            title: t.name,
            value: t.id,
            key: t.id,
            ...(children.length > 0 ? { children } : {}),
          }
        })
    }
    return toNodes(null)
  }, [tags])

  const tagById = useMemo(() => new Map((tags ?? []).map((tg) => [tg.id, tg])), [tags])

  const filterTagTreeNode: TreeSelectProps['filterTreeNode'] = (input, node) =>
    String(node?.title ?? '')
      .toLowerCase()
      .includes(input.trim().toLowerCase())

  const tagIdsFormValueProps = (ids: unknown) => {
    const list = Array.isArray(ids)
      ? ids.filter((x): x is string => typeof x === 'string')
      : []
    return {
      value: list.map((id) => ({
        value: id,
        label: tagPathLabel(id, tagById),
      })),
    }
  }

  const tagIdsFromTreeSelectEvent = (v: unknown) => {
    if (!Array.isArray(v)) return []
    return v.map((item) =>
      item !== null && typeof item === 'object' && 'value' in item && typeof (item as { value: unknown }).value === 'string'
        ? (item as { value: string }).value
        : String(item)
    )
  }

  async function handleCreateTag(values: {
    name: string
    description?: string
    parent_tag_id?: string
  }) {
    try {
      const parentId = values.parent_tag_id?.trim()
      const created = await createTagMutation.mutateAsync({
        name: values.name,
        description: values.description?.trim() ? values.description : undefined,
        active: true,
        applies_to: ['EVENT'],
        ...(parentId ? { parent_tag_id: parentId } : {}),
      })
      const currentTagIds = form.getFieldValue('tag_ids') ?? []
      const nextTagIds = Array.from(new Set([...currentTagIds, created.id]))
      form.setFieldsValue({ tag_ids: nextTagIds })
      setTagModalOpen(false)
      message.success(t('events.tags.createSuccess'))
      await refetchTags()
    } catch {
      message.error(t('events.tags.createError'))
    }
  }

  async function onFinish(values: EventFormValues) {
    const active = mode === 'create' ? true : (initialValues.active ?? true)
    const payload = normalizePayload(values, mode, active)
    await onSubmit(
      payload,
      mode === 'create' ? { pendingEventImage } : undefined
    )
  }

  async function performEventImageUpload(file: File) {
    if (!user) return
    if (mode === 'create') {
      setPendingEventImage(file)
      setPendingPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      form.setFieldsValue({ imageURL: '' })
      return
    }
    if (!eventId) return
    const path = `event-images/${user.uid}/${eventId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    try {
      const storageRef = ref(settingsStorage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      form.setFieldsValue({ imageURL: url })
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
    if (mode === 'create') {
      setPendingEventImage(null)
      setPendingPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      form.setFieldsValue({ imageURL: '' })
      message.success(t('events.form.imageRemoved'))
      return
    }
    form.setFieldsValue({ imageURL: '' })
    message.success(t('events.form.imageRemoved'))
  }

  const urlRule = useMemo(
    () => ({
      validator: async (_: unknown, value: string) => {
        const v = value?.trim() ?? ''
        if (!v) return
        if (!URL_REGEX.test(v)) throw new Error(t('events.form.urlInvalid'))
      },
    }),
    [t]
  )

  const { active: _omitActiveFromForm, ...formInitialRest } = initialValues

  const coverPreviewSrc =
    pendingPreviewUrl?.trim() ||
    (watchedImageUrl?.trim() ? watchedImageUrl.trim() : '')

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={(errorInfo) => {
          const raw = errorInfo?.errorFields?.[0]?.name
          const first =
            Array.isArray(raw) && raw.length > 0
              ? raw[0]
              : typeof raw === 'string'
                ? raw
                : null
          if (typeof first === 'string' && panelKeyByField[first]) setVenuePanelKey(panelKeyByField[first])
        }}
        initialValues={{
          is_paid: false,
          is_online: false,
          ...formInitialRest,
        }}
      >
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} lg={16}>
            <Flex vertical gap={16} style={{ width: '100%' }}>
              <div style={{ width: '100%' }}>
                {coverPreviewSrc ? (
                  <img
                    src={coverPreviewSrc}
                    alt={t('events.form.eventImageAlt')}
                    style={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 12,
                      border: '1px solid var(--ant-color-border)',
                      background: 'var(--ant-color-bg-elevated)',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 200,
                      borderRadius: 12,
                      border: '1px dashed var(--ant-color-border)',
                      background: 'var(--ant-color-bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                    }}
                  >
                    <Typography.Text type="secondary">{t('events.detail.noImage')}</Typography.Text>
                  </div>
                )}
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
                  {coverPreviewSrc ? t('events.form.imageEdit') : t('events.form.imageAdd')}
                </Button>
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

              <Form.Item name="imageURL" hidden rules={[urlRule]}>
                <Input />
              </Form.Item>

              <div style={{ width: '100%' }}>
                <Form.Item
                  style={fieldItemStyle}
                  name="name"
                  label={t('events.form.nameLabel')}
                  rules={[
                    { required: true, message: t('events.form.nameRequired') },
                    { max: 256, message: t('events.form.nameTooLong') },
                  ]}
                >
                  <Input placeholder={t('events.form.namePlaceholder')} />
                </Form.Item>

                <Form.Item style={fieldItemStyle} name="description" label={t('events.form.descriptionLabel')}>
                  <Input.TextArea rows={4} placeholder={t('events.form.descriptionPlaceholder')} />
                </Form.Item>
              </div>
            </Flex>

            <Collapse
              accordion
              activeKey={venuePanelKey}
              onChange={(key) => {
                if (key === undefined || key === null) {
                  setVenuePanelKey(undefined)
                  return
                }
                const k = Array.isArray(key) ? key[0] : key
                setVenuePanelKey(k ? String(k) : undefined)
              }}
              bordered={false}
              style={{ background: 'transparent', marginTop: 8 }}
              items={[
                {
                  key: 'venue',
                  label: t('events.form.sectionVenue'),
                  children: (
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Form.Item style={fieldItemStyle} name="location" label={t('events.form.locationLabel')}>
                        <Input placeholder={t('events.form.locationPlaceholder')} />
                      </Form.Item>

                      <Form.Item
                        style={fieldItemStyle}
                        name="location_address"
                        label={t('events.form.locationAddressLabel')}
                      >
                        <Input placeholder={t('events.form.locationAddressPlaceholder')} />
                      </Form.Item>

                      <Form.Item
                        style={fieldItemStyle}
                        name="location_link"
                        label={t('events.form.locationLinkLabel')}
                        rules={[urlRule]}
                      >
                        <Input placeholder={t('events.form.locationLinkPlaceholder')} />
                      </Form.Item>
                    </Space>
                  ),
                },
              ]}
            />
          </Col>

          <Col xs={24} lg={8}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                  {t('events.form.sectionTags')}
                </Typography.Title>
                <Form.Item style={fieldItemStyle}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Typography.Text type="secondary" style={{ display: 'block' }}>
                      {t('events.tags.helpText')}
                    </Typography.Text>
                    <Form.Item
                      name="tag_ids"
                      noStyle
                      getValueProps={tagIdsFormValueProps}
                      getValueFromEvent={tagIdsFromTreeSelectEvent}
                      rules={[
                        {
                          validator: async (_: unknown, value: string[] | undefined) => {
                            if (value && value.length > 0) return
                            throw new Error(t('events.form.tagIdsRequired'))
                          },
                        },
                      ]}
                    >
                      <TreeSelect
                        style={{ width: '100%' }}
                        treeData={tagTreeData}
                        treeCheckable
                        treeCheckStrictly
                        showCheckedStrategy={TreeSelect.SHOW_ALL}
                        allowClear
                        showSearch
                        treeDefaultExpandAll
                        loading={tagsLoading}
                        placeholder={t('events.tags.pickerPlaceholder')}
                        filterTreeNode={filterTagTreeNode}
                        onOpenChange={(open) => {
                          if (open) void refetchTags()
                        }}
                      />
                    </Form.Item>
                    <Button type="default" onClick={() => setTagModalOpen(true)} disabled={createTagMutation.isPending}>
                      {t('events.tags.createButton')}
                    </Button>
                  </Space>
                </Form.Item>
              </div>

              <div>
                <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                  {t('events.form.sectionVisibility')}
                </Typography.Title>
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Form.Item style={fieldItemStyle} name="is_paid" label={t('events.form.paidLabel')}>
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: t('events.form.yes'), value: true },
                        { label: t('events.form.no'), value: false },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item style={fieldItemStyle} name="is_online" label={t('events.form.onlineLabel')}>
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: t('events.form.onlineOptionOnline'), value: true },
                        { label: t('events.form.onlineOptionInPerson'), value: false },
                      ]}
                    />
                  </Form.Item>
                </Space>
              </div>
            </Space>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" htmlType="submit" loading={submitLoading}>
            {mode === 'create' ? t('events.create.submit') : t('events.edit.submit')}
          </Button>
        </Form.Item>
      </Form>

      <Modal
        title={t('events.tags.createModalTitle')}
        open={tagModalOpen}
        onCancel={() => setTagModalOpen(false)}
        onOk={async () => {
          try {
            const values = await tagForm.validateFields()
            await handleCreateTag(values)
          } catch {
            return
          }
        }}
        okText={t('events.tags.createOk')}
        cancelText={t('events.tags.cancel')}
        confirmLoading={createTagMutation.isPending}
        destroyOnClose
      >
        <Form form={tagForm} layout="vertical" initialValues={{ active: true }}>
          <Form.Item name="name" label={t('events.tags.nameLabel')} rules={[{ required: true, message: t('events.tags.nameRequired') }]}>
            <Input placeholder={t('events.tags.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="parent_tag_id" label={t('events.tags.parentLabel')}>
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              style={{ width: '100%' }}
              placeholder={t('events.tags.parentPlaceholder')}
              treeData={tagTreeData}
              disabled={tagsLoading}
              filterTreeNode={filterTagTreeNode}
            />
          </Form.Item>
          <Form.Item name="description" label={t('events.tags.descriptionLabel')}>
            <Input.TextArea rows={3} placeholder={t('events.tags.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


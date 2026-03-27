import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  Select,
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
import { useEventTags, useCreateTag, useLocations, useCreateLocation } from '../hooks'

import type { Location, Tag as EventTag } from '@/shared/types/api'
import { updateEvent, type CreateEventPayload, type UpdateEventPayload } from '../api'

type EventFormValues = {
  name: string
  description: string
  location_id: string
  imageURL: string
  tag_ids: string[]
  is_paid: boolean
  is_online: boolean
}

type EventFormProps = {
  mode: 'create' | 'edit'
  eventId?: string
  initialValues: Partial<EventFormValues> & { active?: boolean }
  submitLoading: boolean
  onSubmit: (payload: CreateEventPayload | UpdateEventPayload) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

const URL_REGEX = /^https?:\/\/[^\s]+$/i

function snapshotEventFormValuesForDirty(v: EventFormValues): string {
  return JSON.stringify({
    name: (v.name ?? '').trim(),
    description: (v.description ?? '').trim(),
    location_id: (v.location_id ?? '').trim(),
    tag_ids: [...(v.tag_ids ?? [])].sort(),
    is_paid: Boolean(v.is_paid),
    is_online: Boolean(v.is_online),
  })
}

function snapshotFromInitialForDirty(iv: Partial<EventFormValues> & { active?: boolean }): string {
  return snapshotEventFormValuesForDirty({
    name: iv.name ?? '',
    description: iv.description ?? '',
    location_id: iv.location_id ?? '',
    imageURL: '',
    tag_ids: iv.tag_ids ?? [],
    is_paid: iv.is_paid ?? false,
    is_online: iv.is_online ?? false,
  })
}

function selectLabelForLocation(loc: Location): string {
  const name = loc.venue_name?.trim() || loc.id
  const addr = loc.formatted_address?.trim()
  return addr ? `${name} — ${addr}` : name
}

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
  const location_id = values.is_online ? null : values.location_id?.trim() || null
  const common = {
    tag_ids: values.tag_ids,
    active,
    is_paid: values.is_paid,
    is_online: values.is_online,
    location_id,
  }

  const base = {
    name: values.name,
    description: toOptionalString(values.description),
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
    tag_ids: base.tag_ids,
    active: base.active,
    is_paid: base.is_paid,
    is_online: base.is_online,
    location_id: base.location_id,
  }
  return update
}

export function EventForm({
  mode,
  eventId,
  initialValues,
  submitLoading,
  onSubmit,
  onDirtyChange,
}: EventFormProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { token } = theme.useToken()
  const [form] = Form.useForm<EventFormValues>()
  const allFormValues = Form.useWatch([], form) as EventFormValues | undefined
  const editBaselineRef = useRef<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [imageEditOpen, setImageEditOpen] = useState(false)
  const [editImageHover, setEditImageHover] = useState(false)
  const watchedImageUrl = Form.useWatch('imageURL', form) as string | undefined
  const { data: tags, isLoading: tagsLoading, refetch: refetchTags } = useEventTags()
  const createTagMutation = useCreateTag()
  const { data: locations = [], isLoading: locationsLoading, refetch: refetchLocations } = useLocations()
  const createLocationMutation = useCreateLocation()
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [venueModalOpen, setVenueModalOpen] = useState(false)
  const [tagForm] = Form.useForm<{ name: string; description?: string; parent_tag_id?: string }>()
  const [venueForm] = Form.useForm<{ venue_name: string; formatted_address?: string; maps_url?: string }>()
  const [collapsePanelKey, setCollapsePanelKey] = useState<string | undefined>(undefined)
  const isOnlineWatched = Form.useWatch('is_online', form) as boolean | undefined

  const fieldItemStyle = { marginBottom: 10 } as const
  const panelKeyByField: Record<string, string> = {
    imageURL: 'media',
    location_id: 'venue',
  }

  useEffect(() => {
    if (mode !== 'create') return
    form.setFieldsValue({
      name: initialValues.name ?? '',
      description: initialValues.description ?? '',
      location_id: initialValues.location_id ?? '',
      imageURL: initialValues.imageURL ?? '',
      tag_ids: initialValues.tag_ids ?? [],
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
    })
  }, [form, mode, initialValues])

  useEffect(() => {
    if (mode !== 'edit' || !eventId) return
    form.setFieldsValue({
      name: initialValues.name ?? '',
      description: initialValues.description ?? '',
      location_id: initialValues.location_id ?? '',
      imageURL: initialValues.imageURL ?? '',
      tag_ids: initialValues.tag_ids ?? [],
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
    })
  }, [form, mode, eventId])

  useEffect(() => {
    if (isOnlineWatched) {
      form.setFieldsValue({ location_id: '' })
    }
  }, [isOnlineWatched, form])

  useEffect(() => {
    if (!tagModalOpen) {
      tagForm.resetFields()
    }
  }, [tagModalOpen, tagForm])

  useEffect(() => {
    if (!venueModalOpen) {
      venueForm.resetFields()
    }
  }, [venueModalOpen, venueForm])

  useEffect(() => {
    if (mode !== 'edit') return
    editBaselineRef.current = snapshotFromInitialForDirty(initialValues)
  }, [mode, eventId, initialValues])

  useEffect(() => {
    if (mode !== 'edit') {
      setIsDirty(false)
      onDirtyChange?.(false)
      return
    }
    if (!onDirtyChange) return
    const cur = snapshotEventFormValuesForDirty(form.getFieldsValue(true) as EventFormValues)
    const next = cur !== editBaselineRef.current
    setIsDirty(next)
    onDirtyChange(next)
  }, [mode, onDirtyChange, allFormValues, eventId, initialValues, form])

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

  async function handleCreateVenue(values: { venue_name: string; formatted_address?: string; maps_url?: string }) {
    try {
      const created = await createLocationMutation.mutateAsync({
        venue_name: values.venue_name,
        formatted_address: values.formatted_address?.trim() ? values.formatted_address : undefined,
        maps_url: values.maps_url?.trim() ? values.maps_url : undefined,
      })
      form.setFieldsValue({ location_id: created.id })
      setVenueModalOpen(false)
      message.success(t('events.form.venueCreateSuccess'))
      await refetchLocations()
    } catch {
      message.error(t('events.form.venueCreateError'))
    }
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
    await onSubmit(payload)
  }

  async function performEventImageUpload(file: File) {
    if (!user) return
    if (!eventId) return
    const path = `event-images/${user.uid}/${eventId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    try {
      const storageRef = ref(settingsStorage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      const updated = await updateEvent(eventId, { imageURL: url })
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
    if (!eventId) return
    try {
      const updated = await updateEvent(eventId, { imageURL: null })
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

  const coverPreviewSrc = watchedImageUrl?.trim() ? watchedImageUrl.trim() : ''

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
          if (typeof first === 'string' && panelKeyByField[first]) setCollapsePanelKey(panelKeyByField[first])
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
              activeKey={collapsePanelKey}
              onChange={(key) => {
                if (key === undefined || key === null) {
                  setCollapsePanelKey(undefined)
                  return
                }
                const k = Array.isArray(key) ? key[0] : key
                setCollapsePanelKey(k ? String(k) : undefined)
              }}
              bordered={false}
              style={{ background: 'transparent', marginTop: 8 }}
              items={[
                {
                  key: 'venue',
                  forceRender: true,
                  label: t('events.form.sectionVenue'),
                  children: isOnlineWatched === true ? (
                    <Typography.Text type="secondary">{t('events.form.venueOnlineHint')}</Typography.Text>
                  ) : (
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Form.Item
                        style={fieldItemStyle}
                        name="location_id"
                        label={t('events.form.savedVenueLabel')}
                        rules={[
                          {
                            validator: async (_: unknown, value: string | undefined) => {
                              if (form.getFieldValue('is_online')) return
                              const v = typeof value === 'string' ? value.trim() : ''
                              if (!v) throw new Error(t('events.form.savedVenueRequired'))
                            },
                          },
                        ]}
                      >
                        <Select
                          showSearch
                          allowClear
                          loading={locationsLoading}
                          placeholder={t('events.form.savedVenuePlaceholder')}
                          options={locations.map((loc) => ({
                            value: loc.id,
                            label: selectLabelForLocation(loc),
                          }))}
                          filterOption={(input, option) =>
                            String(option?.label ?? '')
                              .toLowerCase()
                              .includes(input.trim().toLowerCase())
                          }
                          onDropdownVisibleChange={(open) => {
                            if (open) void refetchLocations()
                          }}
                        />
                      </Form.Item>
                      <Button
                        type="default"
                        onClick={() => setVenueModalOpen(true)}
                        disabled={createLocationMutation.isPending}
                        style={{ marginBottom: 10 }}
                      >
                        {t('events.form.addVenueButton')}
                      </Button>
                    </Space>
                  ),
                },
                ...(mode === 'edit'
                  ? [
                      {
                        key: 'media',
                        label: t('events.form.sectionMedia'),
                        children: (
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
                        ),
                      },
                    ]
                  : []),
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
          <Button
            type="primary"
            htmlType="submit"
            loading={submitLoading}
            disabled={mode === 'edit' && !isDirty}
          >
            {mode === 'create' ? t('events.create.submit') : t('events.edit.submit')}
          </Button>
        </Form.Item>
      </Form>

      <Modal
        title={t('events.form.venueModalTitle')}
        open={venueModalOpen}
        onCancel={() => setVenueModalOpen(false)}
        onOk={async () => {
          try {
            const values = await venueForm.validateFields()
            await handleCreateVenue(values)
          } catch {
            return
          }
        }}
        okText={t('events.form.venueModalOk')}
        cancelText={t('events.tags.cancel')}
        confirmLoading={createLocationMutation.isPending}
        destroyOnClose
      >
        <Form form={venueForm} layout="vertical">
          <Form.Item
            name="venue_name"
            label={t('events.form.venueNameLabel')}
            rules={[{ required: true, message: t('events.form.venueNameRequired') }]}
          >
            <Input placeholder={t('events.form.venueNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="formatted_address" label={t('events.form.formattedAddressLabel')}>
            <Input placeholder={t('events.form.formattedAddressPlaceholder')} />
          </Form.Item>
          <Form.Item name="maps_url" label={t('events.form.mapsUrlLabel')} rules={[urlRule]}>
            <Input placeholder={t('events.form.mapsUrlPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

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


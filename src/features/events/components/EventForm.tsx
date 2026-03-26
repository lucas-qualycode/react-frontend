import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Collapse,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Tag as AntTag,
  Tooltip,
  TreeSelect,
  Typography,
  message,
} from 'antd'
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
  active: boolean
  is_paid: boolean
  is_online: boolean
}

type EventFormProps = {
  mode: 'create' | 'edit'
  initialValues: Partial<EventFormValues>
  submitLoading: boolean
  onSubmit: (payload: CreateEventPayload | UpdateEventPayload) => Promise<void>
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

function normalizePayload(values: EventFormValues, mode: 'create' | 'edit'): CreateEventPayload | UpdateEventPayload {
  const common = {
    tag_ids: values.tag_ids,
    active: values.active,
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

  if (mode === 'create') return base as CreateEventPayload

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

export function EventForm({ mode, initialValues, submitLoading, onSubmit }: EventFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<EventFormValues>()
  const { data: tags, isLoading: tagsLoading, refetch: refetchTags } = useEventTags()
  const createTagMutation = useCreateTag()
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [tagForm] = Form.useForm<{ name: string; description?: string; parent_tag_id?: string }>()
  const [activePanelKey, setActivePanelKey] = useState<string>('identity')

  const fieldItemStyle = { marginBottom: 10 } as const
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string>('')
  const selectedTagIds = Form.useWatch('tag_ids', form) as string[] | undefined
  const panelKeyByField: Record<string, string> = {
    name: 'identity',
    description: 'identity',
    location: 'venue',
    location_address: 'venue',
    location_link: 'venue',
    imageURL: 'identity',
    tag_ids: 'tags',
    active: 'visibility',
    is_paid: 'visibility',
    is_online: 'visibility',
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
      active: initialValues.active ?? true,
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
    })
    setImagePreviewSrc(initialValues.imageURL ?? '')
  }, [form, initialValues])

  useEffect(() => {
    if (!tagModalOpen) {
      tagForm.resetFields()
    }
  }, [tagModalOpen, tagForm])

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
    const payload = normalizePayload(values, mode)
    await onSubmit(payload)
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

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={(changedValues: Record<string, unknown>) => {
          if (Object.prototype.hasOwnProperty.call(changedValues, 'imageURL')) {
            const v = changedValues.imageURL
            setImagePreviewSrc(typeof v === 'string' ? v : '')
          }
        }}
        onFinishFailed={(errorInfo) => {
          const raw = errorInfo?.errorFields?.[0]?.name
          const first =
            Array.isArray(raw) && raw.length > 0
              ? raw[0]
              : typeof raw === 'string'
                ? raw
                : null
          if (typeof first === 'string' && panelKeyByField[first]) setActivePanelKey(panelKeyByField[first])
          else setActivePanelKey('identity')
        }}
        initialValues={{
          active: true,
          is_paid: false,
          is_online: false,
          ...initialValues,
        }}
      >
        <Collapse
          accordion
          activeKey={activePanelKey}
          onChange={(key) => {
            if (Array.isArray(key)) setActivePanelKey(key[0] ? String(key[0]) : 'identity')
            else setActivePanelKey(String(key))
          }}
          bordered={false}
          style={{ background: 'transparent' }}
          items={[
            {
              key: 'identity',
              label: t('events.form.sectionIdentity'),
              children: (
                <Flex gap={16} align="flex-start" style={{ width: '100%' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
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

                    <Form.Item
                      style={fieldItemStyle}
                      name="description"
                      label={t('events.form.descriptionLabel')}
                    >
                      <Input.TextArea rows={4} placeholder={t('events.form.descriptionPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                      style={fieldItemStyle}
                      name="imageURL"
                      label={t('events.form.imageURLLabel')}
                      rules={[urlRule]}
                    >
                      <Input placeholder={t('events.form.imageURLPlaceholder')} />
                    </Form.Item>
                  </div>

                  <div style={{ width: 260, minWidth: 220 }}>
                    {imagePreviewSrc ? (
                      <img
                        src={imagePreviewSrc}
                        alt={t('events.detail.title')}
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
                  </div>
                </Flex>
              ),
            },
            {
              key: 'venue',
              label: t('events.form.sectionVenue'),
              children: (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Form.Item style={fieldItemStyle} name="location" label={t('events.form.locationLabel')}>
              <Input placeholder={t('events.form.locationPlaceholder')} />
            </Form.Item>

            <Form.Item style={fieldItemStyle} name="location_address" label={t('events.form.locationAddressLabel')}>
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
            {
              key: 'tags',
              label: t('events.form.sectionTags'),
              children: (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Form.Item style={fieldItemStyle} label={t('events.tags.pickerLabel')}>
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
                      {selectedTagIds && selectedTagIds.length > 0 ? (
                        <Flex gap={8} wrap style={{ marginTop: 2 }}>
                          {(tags ?? [])
                            .filter((tg) => selectedTagIds.includes(tg.id))
                            .map((tg) => (
                              <Tooltip
                                key={tg.id}
                                title={
                                  typeof tg.description === 'string' && tg.description.trim().length > 0
                                    ? tg.description
                                    : tg.name
                                }
                              >
                                <AntTag>{tagPathLabel(tg.id, tagById)}</AntTag>
                              </Tooltip>
                            ))}
                        </Flex>
                      ) : null}
                      <Button
                        type="default"
                        onClick={() => setTagModalOpen(true)}
                        disabled={createTagMutation.isPending}
                      >
                        {t('events.tags.createButton')}
                      </Button>
                    </Space>
                  </Form.Item>
                </Space>
              ),
            },
            {
              key: 'visibility',
              label: t('events.form.sectionVisibility'),
              children: (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Form.Item style={fieldItemStyle} name="active" label={t('events.form.activeLabel')} valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item style={fieldItemStyle} name="is_paid" label={t('events.form.paidLabel')} valuePropName="checked">
                    <Switch />
                  </Form.Item>

                  <Form.Item style={fieldItemStyle} name="is_online" label={t('events.form.onlineLabel')} valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Space>
              ),
            },
          ]}
        />

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


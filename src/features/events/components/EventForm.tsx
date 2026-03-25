import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Collapse, Flex, Form, Input, Modal, Select, Space, Switch, Tag, Tooltip, Typography, message } from 'antd'
import type { SelectProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useEventTypes, useCreateEventType } from '../hooks'

import type { EventType } from '@/shared/types/api'
import type { CreateEventPayload, UpdateEventPayload } from '../api'

type EventFormValues = {
  name: string
  description: string
  location: string
  location_address: string
  location_link: string
  imageURL: string
  type_ids: string[]
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

function toOptionalString(s: string | undefined): string | undefined {
  const v = s?.trim() ?? ''
  return v.length > 0 ? v : undefined
}

function normalizePayload(values: EventFormValues, mode: 'create' | 'edit'): CreateEventPayload | UpdateEventPayload {
  const common = {
    type_ids: values.type_ids,
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
    type_ids: base.type_ids,
    active: base.active,
    is_paid: base.is_paid,
    is_online: base.is_online,
  }
  return update
}

export function EventForm({ mode, initialValues, submitLoading, onSubmit }: EventFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<EventFormValues>()
  const { data: types, isLoading: typesLoading, refetch: refetchTypes } = useEventTypes()
  const createTypeMutation = useCreateEventType()
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [typeForm] = Form.useForm<{ name: string; description?: string }>()
  const [activePanelKey, setActivePanelKey] = useState<string>('identity')

  const fieldItemStyle = { marginBottom: 10 } as const
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string>('')
  const selectedTypeIds = Form.useWatch('type_ids', form) as string[] | undefined
  const panelKeyByField: Record<string, string> = {
    name: 'identity',
    description: 'identity',
    location: 'venue',
    location_address: 'venue',
    location_link: 'venue',
    imageURL: 'identity',
    type_ids: 'types',
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
      type_ids: initialValues.type_ids ?? [],
      active: initialValues.active ?? true,
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
    })
    setImagePreviewSrc(initialValues.imageURL ?? '')
  }, [form, initialValues])

  useEffect(() => {
    if (!typeModalOpen) {
      typeForm.resetFields()
    }
  }, [typeModalOpen, typeForm])

  const typeOptions: SelectProps<string[]>['options'] = useMemo(() => {
    return (
      types?.map((et: EventType) => ({
        value: et.id,
        label: et.name,
      })) ?? []
    )
  }, [types])

  async function handleCreateType(values: { name: string; description?: string }) {
    try {
      const created = await createTypeMutation.mutateAsync({
        name: values.name,
        description: values.description?.trim() ? values.description : undefined,
        active: true,
      })
      const currentTypeIds = form.getFieldValue('type_ids') ?? []
      const nextTypeIds = Array.from(new Set([...currentTypeIds, created.id]))
      form.setFieldsValue({ type_ids: nextTypeIds })
      setTypeModalOpen(false)
      message.success(t('events.types.createSuccess'))
      await refetchTypes()
    } catch {
      message.error(t('events.types.createError'))
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
              key: 'types',
              label: t('events.form.sectionTypes'),
              children: (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Form.Item
                    style={fieldItemStyle}
                    name="type_ids"
                    label={t('events.types.pickerLabel')}
                    rules={[
                      {
                        validator: async (_: unknown, value: string[] | undefined) => {
                          if (value && value.length > 0) return
                          throw new Error(t('events.form.typeIdsRequired'))
                        },
                      },
                    ]}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Typography.Text type="secondary" style={{ display: 'block' }}>
                        {t('events.types.helpText')}
                      </Typography.Text>
                      <Select
                        mode="multiple"
                        allowClear
                        options={typeOptions}
                        loading={typesLoading}
                        placeholder={t('events.types.pickerPlaceholder')}
                        maxTagCount={3}
                        optionFilterProp="label"
                        onDropdownVisibleChange={(open) => {
                          if (open) void refetchTypes()
                        }}
                      />
                      {selectedTypeIds && selectedTypeIds.length > 0 ? (
                        <Flex gap={8} wrap style={{ marginTop: 2 }}>
                          {(types ?? [])
                            .filter((et) => selectedTypeIds.includes(et.id))
                            .map((et) => (
                              <Tooltip
                                key={et.id}
                                title={
                                  typeof et.description === 'string' && et.description.trim().length > 0
                                    ? et.description
                                    : et.name
                                }
                              >
                                <Tag>{et.name}</Tag>
                              </Tooltip>
                            ))}
                        </Flex>
                      ) : null}
                      <Button
                        type="default"
                        onClick={() => setTypeModalOpen(true)}
                        disabled={createTypeMutation.isPending}
                      >
                        {t('events.types.createButton')}
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
        title={t('events.types.createModalTitle')}
        open={typeModalOpen}
        onCancel={() => setTypeModalOpen(false)}
        onOk={async () => {
          try {
            const values = await typeForm.validateFields()
            await handleCreateType(values)
          } catch {
            return
          }
        }}
        okText={t('events.types.createOk')}
        cancelText={t('events.types.cancel')}
        confirmLoading={createTypeMutation.isPending}
        destroyOnClose
      >
        <Form form={typeForm} layout="vertical" initialValues={{ active: true }}>
          <Form.Item name="name" label={t('events.types.nameLabel')} rules={[{ required: true, message: t('events.types.nameRequired') }]}>
            <Input placeholder={t('events.types.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('events.types.descriptionLabel')}>
            <Input.TextArea rows={3} placeholder={t('events.types.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


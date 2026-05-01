import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tooltip,
  TreeSelect,
  Typography,
  message,
  theme,
} from 'antd'
import type { TreeSelectProps } from 'antd'
import { useAuth } from '@/app/auth/AuthContext'
import { settingsStorage } from '@/features/settings/storage'
import { ImageEditModal } from '@/shared/components/ImageEditModal'
import type { Tag as ProductTagType } from '@/shared/types/api'
import { useTranslation } from 'react-i18next'
import { handleProductDeleteFailure } from '../handleProductDeleteFailure'
import {
  useCreateProduct,
  useCreateTag,
  useDeleteProduct,
  useEvent,
  useEventTicketProducts,
  useFieldDefinitions,
  useProductTags,
  useUpdateProduct,
} from '../hooks'
import {
  TICKET_PRODUCT_FIELD_STYLE,
  PRODUCT_EDITOR_URL_REGEX,
  type AdditionalInfoFieldFormItem,
  type ProductEditorFormValues,
  fieldDefinitionSelectOptionsForRow,
  orderedAdditionalInfoFieldsFromRefs,
} from './ticketProductFormShared'

type ProductModalTabKey = 'basic' | 'config'

type EventTicketEditorSectionProps = {
  eventId: string
  productId?: string
  onNavigateBack: () => void
}

export function EventTicketEditorSection({
  eventId,
  productId,
  onNavigateBack,
}: EventTicketEditorSectionProps) {
  const { t } = useTranslation()
  const ns = 'events.tickets' as const
  const tp = useCallback((key: string) => t(`${ns}.${key}`), [t])
  const { token } = theme.useToken()
  const { user } = useAuth()
  const isEdit = Boolean(productId)
  const { data: eventForTickets } = useEvent(eventId)
  const ticketForceFree = eventForTickets?.is_paid === false
  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useEventTicketProducts(eventId)
  const editing = useMemo(
    () => (productId ? products.find((p) => p.id === productId) : undefined),
    [products, productId],
  )
  const { data: productTags = [], isLoading: productTagsLoading, refetch: refetchProductTags } =
    useProductTags()
  const fieldDefsQ = useFieldDefinitions(true)
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()
  const createTagMutation = useCreateTag()
  const [form] = Form.useForm<ProductEditorFormValues>()
  const [productModalTab, setProductModalTab] = useState<ProductModalTabKey>('basic')
  const [productImageEditOpen, setProductImageEditOpen] = useState(false)
  const [productImageHover, setProductImageHover] = useState(false)
  const [productTagModalOpen, setProductTagModalOpen] = useState(false)
  const [ticketDeleteModalOpen, setTicketDeleteModalOpen] = useState(false)
  const [productTagForm] = Form.useForm<{ name: string; description?: string; parent_tag_id?: string }>()
  const watchedProductImageUrl = Form.useWatch('imageURL', form) as string | undefined
  const watchedProductIsFree = Form.useWatch('is_free', form) as boolean | undefined
  const watchedAdditionalInfoFields = Form.useWatch('additional_info_fields', form) as
    | AdditionalInfoFieldFormItem[]
    | undefined
  const hydratedRef = useRef<string | null>(null)

  useEffect(() => {
    hydratedRef.current = null
  }, [productId, eventId])

  const tagOptions = useMemo(
    () => productTags.map((x) => ({ value: x.id, label: x.name })),
    [productTags],
  )

  const fieldDefinitionOptions = useMemo(() => {
    const rows = fieldDefsQ.data ?? []
    return rows
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((d) => ({ value: d.id, label: d.label }))
  }, [fieldDefsQ.data])

  const productTagTreeData: TreeSelectProps['treeData'] = useMemo(() => {
    if (!productTags.length) return []
    const byParent = new Map<string | null, ProductTagType[]>()
    for (const tg of productTags) {
      const pid = tg.parent_tag_id ?? null
      const arr = byParent.get(pid) ?? []
      arr.push(tg)
      byParent.set(pid, arr)
    }
    function toNodes(parentId: string | null): NonNullable<TreeSelectProps['treeData']> {
      return (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((tg) => {
          const children = toNodes(tg.id)
          return {
            title: tg.name,
            value: tg.id,
            key: tg.id,
            ...(children.length > 0 ? { children } : {}),
          }
        })
    }
    return toNodes(null)
  }, [productTags])

  const filterProductTagTreeNode: TreeSelectProps['filterTreeNode'] = (input, node) =>
    String(node?.title ?? '')
      .toLowerCase()
      .includes(input.trim().toLowerCase())

  const urlRule = useMemo(
    () => ({
      validator: async (_: unknown, value: string) => {
        const v = value?.trim() ?? ''
        if (!v) return
        if (!PRODUCT_EDITOR_URL_REGEX.test(v)) throw new Error(t('events.form.urlInvalid'))
      },
    }),
    [t],
  )

  const productImagePreviewSrc = watchedProductImageUrl?.trim() ? watchedProductImageUrl.trim() : ''

  async function performProductImageUpload(file: File) {
    if (!user) {
      message.error(t('events.form.submitError'))
      return
    }
    const path = `ticket-images/${user.uid}/${eventId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const storageRef = ref(settingsStorage, path)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    form.setFieldsValue({ imageURL: url })
    message.success(t('events.form.imageUpdated'))
  }

  async function handleRemoveProductImage() {
    form.setFieldsValue({ imageURL: '' })
    message.success(t('events.form.imageRemoved'))
  }

  useEffect(() => {
    setProductModalTab('basic')
  }, [productId])

  useEffect(() => {
    if (!eventForTickets) return
    if (isEdit) {
      if (!editing || hydratedRef.current === editing.id) return
      hydratedRef.current = editing.id
      const forceFree = eventForTickets?.is_paid === false
      form.setFieldsValue({
        name: editing.name,
        description: editing.description,
        is_free: forceFree ? true : editing.is_free,
        price_reais: forceFree ? null : editing.is_free ? null : editing.value / 100,
        quantity: editing.quantity,
        max_per_user: editing.max_per_user,
        active: editing.active,
        tag_ids: (editing.tags ?? []).map((x) => x.id),
        imageURL: editing.imageURL ?? '',
        fulfillment_type: editing.fulfillment_type ?? undefined,
        additional_info_fields: orderedAdditionalInfoFieldsFromRefs(editing.additional_info_fields),
      })
      return
    }
    if (hydratedRef.current === '__create__') return
    hydratedRef.current = '__create__'
    form.setFieldsValue({
      name: '',
      description: '',
      imageURL: '',
      is_free: eventForTickets?.is_paid === false,
      price_reais: null,
      quantity: 1,
      max_per_user: 1,
      active: true,
      tag_ids: [],
      fulfillment_type: undefined,
      additional_info_fields: [],
    })
  }, [isEdit, editing, form, eventForTickets, eventForTickets?.is_paid])

  useEffect(() => {
    if (eventForTickets?.is_paid !== false) return
    form.setFieldsValue({ is_free: true, price_reais: null })
  }, [eventForTickets?.is_paid, form])

  useEffect(() => {
    if (!productTagModalOpen) {
      productTagForm.resetFields()
    }
  }, [productTagModalOpen, productTagForm])

  async function handleCreateProductTag(values: {
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
        applies_to: ['PRODUCT'],
        ...(parentId ? { parent_tag_id: parentId } : {}),
      })
      const current = (form.getFieldValue('tag_ids') as string[] | undefined) ?? []
      form.setFieldsValue({ tag_ids: Array.from(new Set([...current, created.id])) })
      setProductTagModalOpen(false)
      message.success(t('events.tags.createSuccess'))
      await refetchProductTags()
    } catch {
      message.error(t('events.tags.createError'))
    }
  }

  const submitPending = createMutation.isPending || updateMutation.isPending

  const onFinish = useCallback(
    async (v: ProductEditorFormValues) => {
      const isFree = ticketForceFree || v.is_free
      const valueMinor = isFree ? 0 : Math.round((v.price_reais ?? 0) * 100)
      if (!isFree && valueMinor <= 0) {
        message.error(tp('priceRequired'))
        return
      }
      const imageTrim = v.imageURL?.trim() ?? ''
      const fulfillment_type = v.fulfillment_type ?? null
      const additional_info_fields = (v.additional_info_fields ?? [])
        .filter((row) => row?.field_id)
        .map((row, index) => ({
          field_id: row.field_id,
          order: index,
          required: row.required ?? false,
        }))
      const uniqueFieldIds = new Set(additional_info_fields.map((x) => x.field_id))
      if (uniqueFieldIds.size !== additional_info_fields.length) {
        message.error(tp('additionalFieldsDuplicate'))
        return
      }
      const base = {
        name: v.name.trim(),
        description: v.description.trim(),
        imageURL: imageTrim || null,
        is_free: isFree,
        value: valueMinor,
        quantity: v.quantity,
        max_per_user: v.max_per_user,
        additional_info_fields,
        active: v.active,
        tag_ids: v.tag_ids ?? [],
        fulfillment_type,
      }
      try {
        if (isEdit && editing) {
          await updateMutation.mutateAsync({
            productId: editing.id,
            eventId,
            payload: base,
          })
          message.success(tp('updateSuccess'))
        } else {
          await createMutation.mutateAsync({
            ...base,
            parent_id: eventId,
            parent_type: 'EVENT',
            type: 'TICKET',
          })
          message.success(tp('createSuccess'))
        }
        onNavigateBack()
      } catch (e) {
        if (e instanceof Error && e.message) {
          message.error(e.message)
        }
      }
    },
    [
      createMutation,
      editing,
      eventId,
      isEdit,
      onNavigateBack,
      ticketForceFree,
      tp,
      updateMutation,
    ],
  )

  if (productsLoading || !eventForTickets) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Spin />
      </Flex>
    )
  }

  if (productsError) {
    return (
      <div className="event-form-section-panel" style={{ width: '100%' }}>
        <Typography.Paragraph type="danger">{t('events.form.submitError')}</Typography.Paragraph>
        <Button type="default" onClick={onNavigateBack}>
          {tp('pageBack')}
        </Button>
      </div>
    )
  }

  if (isEdit && !editing) {
    return (
      <div className="event-form-section-panel" style={{ width: '100%' }}>
        <Typography.Paragraph type="danger">{t('events.form.submitError')}</Typography.Paragraph>
        <Button type="default" onClick={onNavigateBack}>
          {tp('pageBack')}
        </Button>
      </div>
    )
  }

  return (
    <div className="event-form-section-panel" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center" gap={16} wrap="wrap" style={{ marginBottom: 8 }}>
        <Typography.Title
          level={4}
          style={{ marginTop: 0, marginBottom: 0, flex: '1 1 auto', minWidth: 0 }}
        >
          {isEdit ? tp('pageEditTitle') : tp('pageCreateTitle')}
        </Typography.Title>
        <Button type="default" icon={<ArrowLeftOutlined />} onClick={onNavigateBack}>
          {tp('pageBack')}
        </Button>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {isEdit ? tp('pageEditIntro') : tp('pageCreateIntro')}
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 600 }}
        onFinish={(vals) => void onFinish(vals)}
      >
        <Form.Item name="imageURL" hidden rules={[urlRule]}>
          <Input />
        </Form.Item>
        <Tabs
          className="event-product-form-tabs"
          tabPlacement="top"
          activeKey={productModalTab}
          onChange={(k) => setProductModalTab(k as ProductModalTabKey)}
          styles={{ content: { width: '100%' } }}
          items={[
            {
              key: 'basic',
              label: tp('modalTabBasic'),
              children: (
                <>
                  <Form.Item
                    name="name"
                    label={tp('fieldName')}
                    rules={[{ required: true, message: tp('nameRequired') }]}
                  >
                    <Input maxLength={256} showCount />
                  </Form.Item>
                  <div style={{ width: '100%', marginBottom: 16 }}>
                    <Typography.Title
                      level={5}
                      style={{ marginTop: 0, marginBottom: productImagePreviewSrc ? 12 : 4 }}
                    >
                      {tp('fieldImage')}
                    </Typography.Title>
                    {productImagePreviewSrc ? (
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
                          src={productImagePreviewSrc}
                          alt={tp('productImageAlt')}
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
                    {!productImagePreviewSrc ? (
                      <Button
                        type="link"
                        onClick={() => setProductImageEditOpen(true)}
                        onMouseEnter={() => setProductImageHover(true)}
                        onMouseLeave={() => setProductImageHover(false)}
                        style={{
                          padding: 0,
                          height: 'auto',
                          display: 'block',
                          marginTop: 0,
                          marginBottom: 8,
                          textAlign: 'left',
                          fontWeight: 700,
                          whiteSpace: 'normal',
                          color: productImageHover ? token.colorPrimary : token.colorTextSecondary,
                        }}
                      >
                        {t('events.form.coverImageEmptyHint')}
                      </Button>
                    ) : null}
                    {productImagePreviewSrc ? (
                      <Button
                        type="text"
                        onClick={() => setProductImageEditOpen(true)}
                        onMouseEnter={() => setProductImageHover(true)}
                        onMouseLeave={() => setProductImageHover(false)}
                        style={{
                          padding: 0,
                          height: 'auto',
                          marginTop: 8,
                          color: productImageHover ? token.colorPrimary : token.colorTextSecondary,
                        }}
                      >
                        {t('events.form.imageEdit')}
                      </Button>
                    ) : null}
                    <ImageEditModal
                      open={productImageEditOpen}
                      onClose={() => setProductImageEditOpen(false)}
                      imageUrl={productImagePreviewSrc || undefined}
                      imageAlt={tp('productImageAlt')}
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
                      performUpload={performProductImageUpload}
                      onRemove={handleRemoveProductImage}
                    />
                  </div>
                  <Form.Item
                    name="description"
                    label={tp('fieldDescription')}
                    rules={[{ required: true, message: tp('descriptionRequired') }]}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  {ticketForceFree ? (
                    <>
                      <Form.Item label={tp('fieldPrice')} style={TICKET_PRODUCT_FIELD_STYLE}>
                        <Typography.Text type="secondary">{tp('freeEventTicketHint')}</Typography.Text>
                      </Form.Item>
                      <Form.Item name="is_free" hidden initialValue={true}>
                        <Input type="hidden" />
                      </Form.Item>
                      <Form.Item name="price_reais" hidden initialValue={null}>
                        <Input type="hidden" />
                      </Form.Item>
                    </>
                  ) : (
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        {watchedProductIsFree ? (
                          <Form.Item style={TICKET_PRODUCT_FIELD_STYLE} label={tp('fieldPrice')}>
                            <Typography.Text type="secondary">{tp('free')}</Typography.Text>
                          </Form.Item>
                        ) : (
                          <Form.Item
                            style={TICKET_PRODUCT_FIELD_STYLE}
                            name="price_reais"
                            label={tp('fieldPrice')}
                            rules={[{ required: true, message: tp('priceRequired') }]}
                          >
                            <InputNumber
                              min={0}
                              step={0.01}
                              style={{ width: '100%' }}
                              placeholder={tp('pricePlaceholder')}
                            />
                          </Form.Item>
                        )}
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          style={TICKET_PRODUCT_FIELD_STYLE}
                          name="is_free"
                          label={tp('freeProductQuestion')}
                        >
                          <Radio.Group
                            optionType="button"
                            buttonStyle="solid"
                            options={[
                              { label: t('events.form.yes'), value: true },
                              { label: t('events.form.no'), value: false },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        style={TICKET_PRODUCT_FIELD_STYLE}
                        name="quantity"
                        label={tp('fieldQuantity')}
                        rules={[{ required: true, type: 'number', min: 1 }]}
                      >
                        <InputNumber min={1} step={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        style={TICKET_PRODUCT_FIELD_STYLE}
                        name="max_per_user"
                        label={tp('fieldMaxPerUser')}
                        rules={[{ required: true, type: 'number', min: 1 }]}
                      >
                        <InputNumber min={1} step={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item style={TICKET_PRODUCT_FIELD_STYLE} name="active" label={tp('activeQuestion')}>
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: t('events.form.yes'), value: true },
                        { label: t('events.form.no'), value: false },
                      ]}
                    />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'config',
              label: tp('modalTabConfig'),
              children: (
                <>
                  <Form.Item name="fulfillment_type" label={tp('fieldFulfillmentType')}>
                    <Select
                      allowClear
                      placeholder={tp('fulfillmentTypePlaceholder')}
                      options={(
                        [
                          ['DIGITAL', tp('fulfillmentTypeDigital')],
                          ['WILL_CALL', tp('fulfillmentTypeWillCall')],
                          ['SHIPPING', tp('fulfillmentTypeShipping')],
                          ['PICKUP', tp('fulfillmentTypePickup')],
                        ] as const
                      ).map(([value, label]) => ({ value, label }))}
                    />
                  </Form.Item>
                  <Form.Item
                    style={TICKET_PRODUCT_FIELD_STYLE}
                    label={tp('additionalFieldsPrompt')}
                    required={false}
                  >
                    <Form.List name="additional_info_fields">
                      {(listFields, { add, remove, move }) => (
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          <Row gutter={8} align="middle">
                            <Col span={3}>
                              <Typography.Text type="secondary">
                                {tp('additionalFieldsColumnMove')}
                              </Typography.Text>
                            </Col>
                            <Col span={11}>
                              <Typography.Text type="secondary">
                                {tp('additionalFieldsColumnField')}
                              </Typography.Text>
                            </Col>
                            <Col span={8}>
                              <Typography.Text type="secondary">
                                {tp('additionalFieldsColumnRequired')}
                              </Typography.Text>
                            </Col>
                            <Col span={2} />
                          </Row>
                          {listFields.map((listField, rowIndex) => (
                            <Row key={listField.key} gutter={8} align="middle">
                              <Col span={3}>
                                <Space size={0}>
                                  <Tooltip title={tp('additionalFieldsMoveUp')} placement="bottom">
                                    <span style={{ display: 'inline-flex' }}>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<ArrowUpOutlined />}
                                        aria-label={tp('additionalFieldsMoveUp')}
                                        disabled={rowIndex === 0}
                                        onClick={() => move(rowIndex, rowIndex - 1)}
                                      />
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={tp('additionalFieldsMoveDown')} placement="bottom">
                                    <span style={{ display: 'inline-flex' }}>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<ArrowDownOutlined />}
                                        aria-label={tp('additionalFieldsMoveDown')}
                                        disabled={rowIndex === listFields.length - 1}
                                        onClick={() => move(rowIndex, rowIndex + 1)}
                                      />
                                    </span>
                                  </Tooltip>
                                </Space>
                              </Col>
                              <Col span={11}>
                                <Form.Item
                                  {...listField}
                                  name={[listField.name, 'field_id']}
                                  rules={[{ required: true, message: tp('additionalFieldsFieldRequired') }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Select
                                    showSearch
                                    optionFilterProp="label"
                                    options={fieldDefinitionSelectOptionsForRow(
                                      fieldDefinitionOptions,
                                      watchedAdditionalInfoFields,
                                      rowIndex,
                                    )}
                                    placeholder={tp('additionalFieldsPlaceholder')}
                                    loading={fieldDefsQ.isLoading}
                                    onOpenChange={(open) => {
                                      if (open) void fieldDefsQ.refetch()
                                    }}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item
                                  {...listField}
                                  name={[listField.name, 'required']}
                                  valuePropName="checked"
                                  initialValue={false}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Checkbox aria-label={tp('additionalFieldsColumnRequired')} />
                                </Form.Item>
                              </Col>
                              <Col span={2}>
                                <Button
                                  type="text"
                                  danger
                                  icon={<MinusCircleOutlined />}
                                  aria-label={tp('delete')}
                                  onClick={() => remove(listField.name)}
                                />
                              </Col>
                            </Row>
                          ))}
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => add({ field_id: '', required: false })}
                            block
                          >
                            {tp('additionalFieldsAdd')}
                          </Button>
                        </Space>
                      )}
                    </Form.List>
                  </Form.Item>
                  {!fieldDefsQ.isLoading && fieldDefinitionOptions.length === 0 ? (
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      {tp('additionalFieldsNoneAvailable')}
                    </Typography.Text>
                  ) : null}
                  <Form.Item label={tp('fieldTags')}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Form.Item name="tag_ids" noStyle>
                        <Select
                          mode="multiple"
                          allowClear
                          optionFilterProp="label"
                          options={tagOptions}
                          placeholder={tp('tagsPlaceholder')}
                          loading={productTagsLoading}
                          onOpenChange={(open) => {
                            if (open) void refetchProductTags()
                          }}
                        />
                      </Form.Item>
                      <Button
                        type="default"
                        onClick={() => setProductTagModalOpen(true)}
                        disabled={createTagMutation.isPending}
                      >
                        {t('events.tags.createButton')}
                      </Button>
                    </Space>
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
        <Flex justify="space-between" align="center" gap={16} wrap="wrap" style={{ marginTop: 24 }}>
          <div>
            {isEdit && editing ? (
              <Button
                danger
                disabled={deleteMutation.isPending}
                onClick={() => setTicketDeleteModalOpen(true)}
              >
                {tp('delete')}
              </Button>
            ) : null}
          </div>
          <Space>
            <Button htmlType="button" onClick={onNavigateBack}>
              {t('events.tags.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={submitPending}>
              {tp('modalOk')}
            </Button>
          </Space>
        </Flex>
      </Form>
      <Modal
        title={t('events.tags.createModalTitleProduct')}
        open={productTagModalOpen}
        onCancel={() => setProductTagModalOpen(false)}
        onOk={async () => {
          try {
            const values = await productTagForm.validateFields()
            await handleCreateProductTag(values)
          } catch {
            return
          }
        }}
        okText={t('events.tags.createOk')}
        cancelText={t('events.tags.cancel')}
        confirmLoading={createTagMutation.isPending}
        destroyOnClose
      >
        <Form form={productTagForm} layout="vertical" initialValues={{ active: true }}>
          <Form.Item
            name="name"
            label={t('events.tags.nameLabel')}
            rules={[{ required: true, message: t('events.tags.nameRequired') }]}
          >
            <Input placeholder={t('events.tags.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="parent_tag_id" label={t('events.tags.parentLabel')}>
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              style={{ width: '100%' }}
              placeholder={t('events.tags.parentPlaceholder')}
              treeData={productTagTreeData}
              disabled={productTagsLoading}
              filterTreeNode={filterProductTagTreeNode}
            />
          </Form.Item>
          <Form.Item name="description" label={t('events.tags.descriptionLabel')}>
            <Input.TextArea rows={3} placeholder={t('events.tags.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
      {isEdit && editing ? (
        <Modal
          title={tp('deleteConfirmTitle')}
          open={ticketDeleteModalOpen}
          okText={tp('deleteOk')}
          cancelText={t('events.tags.cancel')}
          okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
          onCancel={() => setTicketDeleteModalOpen(false)}
          onOk={async () => {
            if (!editing) return
            try {
              await deleteMutation.mutateAsync({ productId: editing.id, eventId })
              message.success(tp('deleteSuccess'))
              setTicketDeleteModalOpen(false)
              onNavigateBack()
            } catch (e) {
              setTicketDeleteModalOpen(false)
              handleProductDeleteFailure(e, t)
            }
          }}
        >
          <Typography.Paragraph style={{ marginBottom: 0 }}>{tp('deleteConfirmBody')}</Typography.Paragraph>
        </Modal>
      ) : null}
    </div>
  )
}

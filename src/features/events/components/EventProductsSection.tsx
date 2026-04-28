import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
  Col,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  TreeSelect,
  Typography,
  message,
  theme,
} from 'antd'
import { useAuth } from '@/app/auth/AuthContext'
import { settingsStorage } from '@/features/settings/storage'
import { ImageEditModal } from '@/shared/components/ImageEditModal'
import { ListItemMediaCard } from '@/shared/components/ListItemMediaCard'
import type { ColumnsType } from 'antd/es/table'
import type { TreeSelectProps } from 'antd'
import { useTranslation } from 'react-i18next'
import type { FulfillmentType, Product, Tag as ProductTagType } from '@/shared/types/api'
import {
  useCreateProduct,
  useCreateTag,
  useDeleteProduct,
  useEvent,
  useEventMerchProducts,
  useEventTicketProducts,
  useFieldDefinitions,
  useProductTags,
  useUpdateProduct,
} from '../hooks'

const URL_REGEX = /^https?:\/\/[^\s]+$/i

type AdditionalInfoFieldFormItem = {
  field_id: string
  required: boolean
}

function fieldDefinitionSelectOptionsForRow(
  base: { value: string; label: string }[],
  allRows: AdditionalInfoFieldFormItem[] | undefined,
  rowIndex: number,
) {
  const rows = allRows ?? []
  const taken = new Set<string>()
  rows.forEach((row, i) => {
    if (i === rowIndex) return
    const id = typeof row?.field_id === 'string' ? row.field_id.trim() : ''
    if (id) taken.add(id)
  })
  const current = typeof rows[rowIndex]?.field_id === 'string' ? rows[rowIndex].field_id.trim() : ''
  return base.filter((o) => !taken.has(o.value) || o.value === current)
}

function orderedAdditionalInfoFieldsFromRefs(
  refs: Product['additional_info_fields'] | undefined,
): AdditionalInfoFieldFormItem[] {
  if (!refs?.length) return []
  return [...refs]
    .filter((r) => r.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((r) => ({
      field_id: r.field_id,
      required: r.required ?? false,
    }))
}

type ProductFormValues = {
  name: string
  description: string
  imageURL: string
  is_free: boolean
  price_reais: number | null
  quantity: number
  max_per_user: number
  active: boolean
  tag_ids: string[]
  fulfillment_type?: FulfillmentType | null
  additional_info_fields?: AdditionalInfoFieldFormItem[]
}

const brl = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

const productModalFieldStyle = { marginBottom: 10 } as const

type ProductModalTabKey = 'basic' | 'config'

const { Text } = Typography

function formatPriceMinorUnits(minor: number): string {
  return brl.format(minor / 100)
}

function productPriceLabel(row: Product, tp: (key: string) => string): string {
  return row.is_free ? tp('free') : formatPriceMinorUnits(row.value)
}

function productStockLabel(row: Product): string {
  const a = row.inventory?.available_quantity
  return a !== undefined ? `${a} / ${row.quantity}` : String(row.quantity)
}

export type EventProductsSectionProps = {
  eventId: string
  variant?: 'merchandise' | 'ticket'
}

export function EventProductsSection({
  eventId,
  variant = 'merchandise',
}: EventProductsSectionProps) {
  const { t } = useTranslation()
  const ns = variant === 'ticket' ? 'events.tickets' : 'events.products'
  const tp = useCallback((key: string) => t(`${ns}.${key}`), [t, ns])
  const { token } = theme.useToken()
  const { user } = useAuth()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const { xs } = screens
  const merchQ = useEventMerchProducts(variant === 'merchandise' ? eventId : undefined)
  const ticketQ = useEventTicketProducts(variant === 'ticket' ? eventId : undefined)
  const { data: eventForTickets } = useEvent(variant === 'ticket' ? eventId : undefined)
  const ticketForceFree = variant === 'ticket' && eventForTickets?.is_paid === false
  const isLoading = variant === 'merchandise' ? merchQ.isLoading : ticketQ.isLoading
  const products = (variant === 'merchandise' ? merchQ.data : ticketQ.data) ?? []
  const { data: productTags = [], isLoading: productTagsLoading, refetch: refetchProductTags } =
    useProductTags()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()
  const createTagMutation = useCreateTag()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form] = Form.useForm<ProductFormValues>()
  const [productTagModalOpen, setProductTagModalOpen] = useState(false)
  const [productTagForm] = Form.useForm<{ name: string; description?: string; parent_tag_id?: string }>()
  const [productImageEditOpen, setProductImageEditOpen] = useState(false)
  const [productImageHover, setProductImageHover] = useState(false)
  const [productModalTab, setProductModalTab] = useState<ProductModalTabKey>('basic')
  const watchedProductImageUrl = Form.useWatch('imageURL', form) as string | undefined
  const watchedProductIsFree = Form.useWatch('is_free', form) as boolean | undefined
  const watchedAdditionalInfoFields = Form.useWatch('additional_info_fields', form) as
    | AdditionalInfoFieldFormItem[]
    | undefined
  const fieldDefsQ = useFieldDefinitions(variant === 'ticket' && modalOpen)

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
        if (!URL_REGEX.test(v)) throw new Error(t('events.form.urlInvalid'))
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
    const folder = variant === 'ticket' ? 'ticket-images' : 'product-images'
    const path = `${folder}/${user.uid}/${eventId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
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
    if (modalOpen) {
      setProductModalTab('basic')
    }
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) {
      form.resetFields()
      return
    }
    if (editing) {
      const forceFree = variant === 'ticket' && eventForTickets?.is_paid === false
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
        ...(variant === 'ticket'
          ? {
              additional_info_fields: orderedAdditionalInfoFieldsFromRefs(editing.additional_info_fields),
            }
          : {}),
      })
    } else {
      form.setFieldsValue({
        name: '',
        description: '',
        imageURL: '',
        is_free: variant === 'ticket' && eventForTickets?.is_paid === false,
        price_reais: null,
        quantity: 1,
        max_per_user: 1,
        active: true,
        tag_ids: [],
        fulfillment_type: undefined,
        ...(variant === 'ticket' ? { additional_info_fields: [] } : {}),
      })
    }
  }, [modalOpen, editing, form, variant, eventForTickets?.is_paid])

  useEffect(() => {
    if (!modalOpen || variant !== 'ticket') return
    if (eventForTickets?.is_paid !== false) return
    form.setFieldsValue({ is_free: true, price_reais: null })
  }, [modalOpen, variant, eventForTickets?.is_paid, form])

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

  const openCreate = useCallback(() => {
    setEditing(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((p: Product) => {
    setEditing(p)
    setModalOpen(true)
  }, [])

  async function handleModalOk() {
    try {
      const v = await form.validateFields()
      const isFree = ticketForceFree || v.is_free
      const valueMinor = isFree ? 0 : Math.round((v.price_reais ?? 0) * 100)
      if (!isFree && valueMinor <= 0) {
        message.error(tp('priceRequired'))
        return
      }
      const imageTrim = v.imageURL?.trim() ?? ''
      const fulfillment_type = v.fulfillment_type ?? null
      const additional_info_fields =
        variant === 'ticket'
          ? (v.additional_info_fields ?? [])
              .filter((row) => row?.field_id)
              .map((row, index) => ({
                field_id: row.field_id,
                order: index,
                required: row.required ?? false,
              }))
          : []
      if (variant === 'ticket') {
        const uniqueFieldIds = new Set(additional_info_fields.map((x) => x.field_id))
        if (uniqueFieldIds.size !== additional_info_fields.length) {
          message.error(tp('additionalFieldsDuplicate'))
          return
        }
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
      if (editing) {
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
          type: variant === 'ticket' ? 'TICKET' : 'MERCH',
        })
        message.success(tp('createSuccess'))
      }
      setModalOpen(false)
      setEditing(null)
    } catch (e) {
      if (e instanceof Error && e.message) {
        message.error(e.message)
      }
    }
  }

  const columns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: tp('colName'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
      },
      {
        title: tp('colPrice'),
        key: 'price',
        width: 120,
        render: (_, row) => productPriceLabel(row, tp),
      },
      {
        title: tp('colStock'),
        key: 'stock',
        width: 140,
        render: (_, row) => productStockLabel(row),
      },
      {
        title: tp('colActive'),
        dataIndex: 'active',
        key: 'active',
        width: 90,
        render: (active: boolean) => (active ? t('events.form.yes') : t('events.form.no')),
      },
    ],
    [t, tp],
  )

  return (
    <div className="event-form-section-panel" style={{ width: '100%' }}>
      <Flex
        justify="space-between"
        align="center"
        gap={16}
        wrap="wrap"
        style={{ marginBottom: 8 }}
      >
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 0, flex: '1 1 auto' }}>
          {tp('sectionTitle')}
        </Typography.Title>
        <Button type="primary" onClick={openCreate}>
          {tp('addButton')}
        </Button>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {tp('sectionIntro')}
      </Typography.Paragraph>
      {isLoading ? (
        <Spin />
      ) : useCardLayout ? (
        products.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tp('tableEmpty')} />
        ) : (
          <Row gutter={[16, 16]}>
            {products.map((row) => {
              const imageHeight = xs ? 180 : 200
              return (
                <Col key={row.id} span={24}>
                  <ListItemMediaCard
                    title={row.name}
                    imageAlt={row.name}
                    imageSrc={row.imageURL}
                    imageHeight={imageHeight}
                    onClick={() => openEdit(row)}
                    noImageText={t('events.detail.noImage')}
                    headerTrailing={
                      <>
                        <Tag color={row.active ? 'green' : 'default'}>
                          {row.active ? t('userEvents.badgeActive') : t('userEvents.badgeInactive')}
                        </Tag>
                        <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                          <Space size={0}>
                            <Tooltip title={tp('edit')} placement="bottom">
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                aria-label={tp('edit')}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  openEdit(row)
                                }}
                              />
                            </Tooltip>
                            <Popconfirm
                              title={tp('deleteConfirmTitle')}
                              description={tp('deleteConfirmBody')}
                              okText={tp('deleteOk')}
                              cancelText={t('events.tags.cancel')}
                              onConfirm={async () => {
                                try {
                                  await deleteMutation.mutateAsync({ productId: row.id, eventId })
                                  message.success(tp('deleteSuccess'))
                                } catch (e) {
                                  if (e instanceof Error && e.message) message.error(e.message)
                                }
                              }}
                            >
                              <Tooltip title={tp('delete')} placement="bottom">
                                <span>
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    aria-label={tp('delete')}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                  />
                                </span>
                              </Tooltip>
                            </Popconfirm>
                          </Space>
                        </span>
                      </>
                    }
                    footer={
                      <Flex wrap="wrap" align="center" gap={4} style={{ padding: '12px 24px 24px' }}>
                        <Text type="secondary">
                          {tp('colPrice')}: {productPriceLabel(row, tp)}
                        </Text>
                        <Text type="secondary" style={{ userSelect: 'none', opacity: 0.55 }}>
                          ·
                        </Text>
                        <Text type="secondary">
                          {t(`${ns}.cardStockSlash`, {
                            available:
                              row.inventory?.available_quantity !== undefined
                                ? row.inventory.available_quantity
                                : '—',
                            total: row.quantity,
                          })}
                        </Text>
                      </Flex>
                    }
                  />
                </Col>
              )
            })}
          </Row>
        )
      ) : (
        <Table<Product>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={products}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: tp('tableEmpty') }}
          onRow={(record) => ({
            onClick: () => openEdit(record),
            style: { cursor: 'pointer' },
          })}
        />
      )}
      <Modal
        title={editing ? tp('modalEditTitle') : tp('modalCreateTitle')}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        destroyOnClose
        width={600}
        footer={
          <Flex justify="space-between" align="center" gap={16} wrap="wrap" style={{ width: '100%' }}>
            <div>
              {editing ? (
                <Popconfirm
                  title={tp('deleteConfirmTitle')}
                  description={tp('deleteConfirmBody')}
                  okText={tp('deleteOk')}
                  cancelText={t('events.tags.cancel')}
                  onConfirm={async () => {
                    try {
                      await deleteMutation.mutateAsync({ productId: editing.id, eventId })
                      message.success(tp('deleteSuccess'))
                      setModalOpen(false)
                      setEditing(null)
                    } catch (e) {
                      if (e instanceof Error && e.message) message.error(e.message)
                    }
                  }}
                >
                  <Button danger disabled={deleteMutation.isPending}>
                    {tp('delete')}
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
            <Space>
              <Button
                onClick={() => {
                  setModalOpen(false)
                  setEditing(null)
                }}
              >
                {t('events.tags.cancel')}
              </Button>
              <Button
                type="primary"
                loading={createMutation.isPending || updateMutation.isPending}
                onClick={() => void handleModalOk()}
              >
                {tp('modalOk')}
              </Button>
            </Space>
          </Flex>
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
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
                      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                        {tp('freeEventTicketHint')}
                      </Typography.Paragraph>
                    ) : null}
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        {ticketForceFree || watchedProductIsFree ? (
                          <Form.Item style={productModalFieldStyle} label={tp('fieldPrice')}>
                            <Typography.Text type="secondary">{tp('free')}</Typography.Text>
                          </Form.Item>
                        ) : (
                          <Form.Item
                            style={productModalFieldStyle}
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
                          style={productModalFieldStyle}
                          name="is_free"
                          label={tp('freeProductQuestion')}
                        >
                          <Radio.Group
                            optionType="button"
                            buttonStyle="solid"
                            disabled={ticketForceFree}
                            options={[
                              { label: t('events.form.yes'), value: true },
                              { label: t('events.form.no'), value: false },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          style={productModalFieldStyle}
                          name="quantity"
                          label={tp('fieldQuantity')}
                          rules={[{ required: true, type: 'number', min: 1 }]}
                        >
                          <InputNumber min={1} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          style={productModalFieldStyle}
                          name="max_per_user"
                          label={tp('fieldMaxPerUser')}
                          rules={[{ required: true, type: 'number', min: 1 }]}
                        >
                          <InputNumber min={1} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    {variant === 'ticket' ? (
                      <Form.Item style={productModalFieldStyle} name="active" label={tp('activeQuestion')}>
                        <Radio.Group
                          optionType="button"
                          buttonStyle="solid"
                          options={[
                            { label: t('events.form.yes'), value: true },
                            { label: t('events.form.no'), value: false },
                          ]}
                        />
                      </Form.Item>
                    ) : null}
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
                    {variant === 'ticket' ? (
                      <>
                        <Form.Item
                          style={productModalFieldStyle}
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
                      </>
                    ) : null}
                    {variant !== 'ticket' ? (
                      <Form.Item style={productModalFieldStyle} name="active" label={tp('activeQuestion')}>
                        <Radio.Group
                          optionType="button"
                          buttonStyle="solid"
                          options={[
                            { label: t('events.form.yes'), value: true },
                            { label: t('events.form.no'), value: false },
                          ]}
                        />
                      </Form.Item>
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
        </Form>
      </Modal>
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
    </div>
  )
}

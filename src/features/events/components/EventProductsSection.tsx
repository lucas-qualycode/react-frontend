import { DeleteOutlined, EditOutlined, PictureOutlined } from '@ant-design/icons'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Divider,
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
import type { ColumnsType } from 'antd/es/table'
import type { TreeSelectProps } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Product, Tag as ProductTagType } from '@/shared/types/api'
import {
  useCreateProduct,
  useCreateTag,
  useDeleteProduct,
  useEventMerchProducts,
  useProductTags,
  useUpdateProduct,
} from '../hooks'

const URL_REGEX = /^https?:\/\/[^\s]+$/i

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
}

const brl = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' })

const productModalFieldStyle = { marginBottom: 10 } as const

const { Text } = Typography

function formatPriceMinorUnits(minor: number): string {
  return brl.format(minor / 100)
}

function productPriceLabel(row: Product, t: (key: string) => string): string {
  return row.is_free ? t('events.products.free') : formatPriceMinorUnits(row.value)
}

function productStockLabel(row: Product): string {
  const a = row.inventory?.available_quantity
  return a !== undefined ? `${a} / ${row.quantity}` : String(row.quantity)
}

export type EventProductsSectionProps = {
  eventId: string
}

export function EventProductsSection({ eventId }: EventProductsSectionProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { user } = useAuth()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const { xs } = screens
  const { data: products = [], isLoading } = useEventMerchProducts(eventId)
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
  const watchedProductImageUrl = Form.useWatch('imageURL', form) as string | undefined

  const tagOptions = useMemo(
    () => productTags.map((x) => ({ value: x.id, label: x.name })),
    [productTags],
  )

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
    const path = `product-images/${user.uid}/${eventId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
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
    if (!modalOpen) {
      form.resetFields()
      return
    }
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        description: editing.description,
        is_free: editing.is_free,
        price_reais: editing.is_free ? null : editing.value / 100,
        quantity: editing.quantity,
        max_per_user: editing.max_per_user,
        active: editing.active,
        tag_ids: (editing.tags ?? []).map((x) => x.id),
        imageURL: editing.imageURL ?? '',
      })
    } else {
      form.setFieldsValue({
        name: '',
        description: '',
        imageURL: '',
        is_free: false,
        price_reais: null,
        quantity: 1,
        max_per_user: 1,
        active: true,
        tag_ids: [],
      })
    }
  }, [modalOpen, editing, form])

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
      const valueMinor = v.is_free ? 0 : Math.round((v.price_reais ?? 0) * 100)
      if (!v.is_free && valueMinor <= 0) {
        message.error(t('events.products.priceRequired'))
        return
      }
      const imageTrim = v.imageURL?.trim() ?? ''
      const base = {
        name: v.name.trim(),
        description: v.description.trim(),
        imageURL: imageTrim || null,
        is_free: v.is_free,
        value: valueMinor,
        quantity: v.quantity,
        max_per_user: v.max_per_user,
        request_additional_info: editing ? editing.request_additional_info : false,
        active: v.active,
        tag_ids: v.tag_ids ?? [],
      }
      if (editing) {
        await updateMutation.mutateAsync({
          productId: editing.id,
          eventId,
          payload: base,
        })
        message.success(t('events.products.updateSuccess'))
      } else {
        await createMutation.mutateAsync({
          ...base,
          parent_id: eventId,
          parent_type: 'EVENT',
        })
        message.success(t('events.products.createSuccess'))
      }
      setModalOpen(false)
      setEditing(null)
    } catch (e) {
      if (e instanceof Error && e.message) {
        message.error(e.message)
      }
    }
  }

  const renderProductActions = useCallback(
    (row: Product) => (
      <Space size="small" wrap>
        <Button type="link" size="small" onClick={() => openEdit(row)}>
          {t('events.products.edit')}
        </Button>
        <Popconfirm
          title={t('events.products.deleteConfirmTitle')}
          description={t('events.products.deleteConfirmBody')}
          okText={t('events.products.deleteOk')}
          cancelText={t('events.tags.cancel')}
          onConfirm={async () => {
            try {
              await deleteMutation.mutateAsync({ productId: row.id, eventId })
              message.success(t('events.products.deleteSuccess'))
            } catch (e) {
              if (e instanceof Error && e.message) message.error(e.message)
            }
          }}
        >
          <Button type="link" size="small" danger>
            {t('events.products.delete')}
          </Button>
        </Popconfirm>
      </Space>
    ),
    [t, deleteMutation, eventId, openEdit],
  )

  const columns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: t('events.products.fieldImage'),
        key: 'image',
        width: 72,
        render: (_, row) => {
          const src = row.imageURL?.trim()
          return src ? (
            <img
              src={src}
              alt=""
              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, display: 'block' }}
            />
          ) : (
            <Flex
              align="center"
              justify="center"
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: 'var(--ant-color-bg-elevated)',
                border: '1px dashed var(--ant-color-border)',
              }}
            >
              <PictureOutlined style={{ color: 'var(--ant-color-text-quaternary)' }} />
            </Flex>
          )
        },
      },
      {
        title: t('events.products.colName'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
      },
      {
        title: t('events.products.colPrice'),
        key: 'price',
        width: 120,
        render: (_, row) => productPriceLabel(row, t),
      },
      {
        title: t('events.products.colStock'),
        key: 'stock',
        width: 140,
        render: (_, row) => productStockLabel(row),
      },
      {
        title: t('events.products.colActive'),
        dataIndex: 'active',
        key: 'active',
        width: 90,
        render: (active: boolean) => (active ? t('events.form.yes') : t('events.form.no')),
      },
      {
        title: t('events.products.colActions'),
        key: 'actions',
        width: 160,
        render: (_, row) => renderProductActions(row),
      },
    ],
    [t, renderProductActions],
  )

  return (
    <div className="event-form-section-panel" style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
        {t('events.products.sectionTitle')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t('events.products.sectionIntro')}
      </Typography.Paragraph>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreate}>
          {t('events.products.addButton')}
        </Button>
      </Space>
      {isLoading ? (
        <Spin />
      ) : useCardLayout ? (
        products.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('events.products.tableEmpty')} />
        ) : (
          <Row gutter={[16, 16]}>
            {products.map((row) => {
              const imageHeight = xs ? 180 : 200
              return (
                <Col key={row.id} span={24}>
                  <Card
                    hoverable
                    styles={{ body: { padding: 0 } }}
                    onClick={() => openEdit(row)}
                  >
                    <Flex vertical>
                      <Flex
                        justify="space-between"
                        align="center"
                        gap={12}
                        style={{ padding: '12px 24px' }}
                      >
                        <Text strong ellipsis style={{ flex: 1, minWidth: 0 }}>
                          {row.name}
                        </Text>
                        <Flex align="center" gap={8} wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
                          <Tag color={row.active ? 'green' : 'default'}>
                            {row.active ? t('userEvents.badgeActive') : t('userEvents.badgeInactive')}
                          </Tag>
                          <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                            <Space size={0}>
                              <Tooltip title={t('events.products.edit')} placement="bottom">
                                <Button
                                  type="text"
                                  icon={<EditOutlined />}
                                  aria-label={t('events.products.edit')}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    openEdit(row)
                                  }}
                                />
                              </Tooltip>
                              <Popconfirm
                                title={t('events.products.deleteConfirmTitle')}
                                description={t('events.products.deleteConfirmBody')}
                                okText={t('events.products.deleteOk')}
                                cancelText={t('events.tags.cancel')}
                                onConfirm={async () => {
                                  try {
                                    await deleteMutation.mutateAsync({ productId: row.id, eventId })
                                    message.success(t('events.products.deleteSuccess'))
                                  } catch (e) {
                                    if (e instanceof Error && e.message) message.error(e.message)
                                  }
                                }}
                              >
                                <Tooltip title={t('events.products.delete')} placement="bottom">
                                  <span>
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      aria-label={t('events.products.delete')}
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
                        </Flex>
                      </Flex>
                      <div style={{ width: '100%', height: imageHeight, overflow: 'hidden' }}>
                        {row.imageURL?.trim() ? (
                          <img
                            src={row.imageURL.trim()}
                            alt={row.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Flex
                            vertical
                            align="center"
                            justify="center"
                            gap={8}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'var(--ant-color-bg-elevated)',
                              borderTop: '1px dashed var(--ant-color-border)',
                              padding: 16,
                              boxSizing: 'border-box',
                            }}
                          >
                            <PictureOutlined
                              style={{ fontSize: 40, color: 'var(--ant-color-text-quaternary)' }}
                              aria-hidden
                            />
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                              {t('events.detail.noImage')}
                            </Text>
                          </Flex>
                        )}
                      </div>
                      <Flex
                        wrap="wrap"
                        align="center"
                        gap={4}
                        style={{ padding: '12px 24px 24px' }}
                      >
                        <Text type="secondary">
                          {t('events.products.colPrice')}: {productPriceLabel(row, t)}
                        </Text>
                        <Text type="secondary" style={{ userSelect: 'none', opacity: 0.55 }}>
                          ·
                        </Text>
                        <Text type="secondary">
                          {t('events.products.cardStockSlash', {
                            available:
                              row.inventory?.available_quantity !== undefined
                                ? row.inventory.available_quantity
                                : '—',
                            total: row.quantity,
                          })}
                        </Text>
                      </Flex>
                    </Flex>
                  </Card>
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
          locale={{ emptyText: t('events.products.tableEmpty') }}
        />
      )}
      <Modal
        title={editing ? t('events.products.modalEditTitle') : t('events.products.modalCreateTitle')}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => void handleModalOk()}
        okText={t('events.products.modalOk')}
        cancelText={t('events.tags.cancel')}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="imageURL" hidden rules={[urlRule]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('events.products.fieldName')}
            rules={[{ required: true, message: t('events.products.nameRequired') }]}
          >
            <Input maxLength={256} showCount />
          </Form.Item>
          <div style={{ width: '100%', marginBottom: 16 }}>
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: productImagePreviewSrc ? 12 : 4 }}>
              {t('events.products.fieldImage')}
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
                  alt={t('events.products.productImageAlt')}
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
              imageAlt={t('events.products.productImageAlt')}
              variant="roundedRect"
              previewFallback={<Typography.Text type="secondary">{t('events.detail.noImage')}</Typography.Text>}
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
            label={t('events.products.fieldDescription')}
            rules={[{ required: true, message: t('events.products.descriptionRequired') }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item noStyle shouldUpdate={(p, c) => p.is_free !== c.is_free}>
                {() => {
                  const free = form.getFieldValue('is_free') as boolean | undefined
                  if (free) {
                    return (
                      <Form.Item style={productModalFieldStyle} label={t('events.products.fieldPrice')}>
                        <Typography.Text type="secondary">{t('events.products.free')}</Typography.Text>
                      </Form.Item>
                    )
                  }
                  return (
                    <Form.Item
                      style={productModalFieldStyle}
                      name="price_reais"
                      label={t('events.products.fieldPrice')}
                      rules={[{ required: true, message: t('events.products.priceRequired') }]}
                    >
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: '100%' }}
                        placeholder={t('events.products.pricePlaceholder')}
                      />
                    </Form.Item>
                  )
                }}
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item style={productModalFieldStyle} name="is_free" label={t('events.products.freeProductQuestion')}>
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
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                style={productModalFieldStyle}
                name="quantity"
                label={t('events.products.fieldQuantity')}
                rules={[{ required: true, type: 'number', min: 1 }]}
              >
                <InputNumber min={1} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                style={productModalFieldStyle}
                name="max_per_user"
                label={t('events.products.fieldMaxPerUser')}
                rules={[{ required: true, type: 'number', min: 1 }]}
              >
                <InputNumber min={1} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Typography.Title level={5} style={{ marginTop: 8, marginBottom: 8 }}>
            {t('events.products.sectionOptions')}
          </Typography.Title>
          <Divider style={{ margin: '0 0 16px' }} />
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Form.Item style={productModalFieldStyle} name="active" label={t('events.products.activeQuestion')}>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: t('events.form.yes'), value: true },
                  { label: t('events.form.no'), value: false },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item label={t('events.products.fieldTags')}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Form.Item name="tag_ids" noStyle>
                <Select
                  mode="multiple"
                  allowClear
                  optionFilterProp="label"
                  options={tagOptions}
                  placeholder={t('events.products.tagsPlaceholder')}
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

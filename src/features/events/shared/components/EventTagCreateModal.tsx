import { useEffect, useMemo } from 'react'
import { Form, Input, Modal, TreeSelect, message } from 'antd'
import type { TreeSelectProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateTag, useEventTags } from '@/features/events/hooks'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import type { Tag as EventTag } from '@/shared/types/api'

type TagCreateFormValues = {
  name: string
  description?: string
  parent_tag_id?: string
}

type EventTagCreateModalProps = {
  open: boolean
  onClose: () => void
}

export function EventTagCreateModal({ open, onClose }: EventTagCreateModalProps) {
  const { t } = useTranslation()
  const parentForm = Form.useFormInstance<EventFormValues>()
  const [tagForm] = Form.useForm<TagCreateFormValues>()
  const { data: tags, isLoading: tagsLoading, refetch: refetchTags } = useEventTags()
  const createTagMutation = useCreateTag()

  useEffect(() => {
    if (!open) {
      tagForm.resetFields()
    }
  }, [open, tagForm])

  const tagTreeData: TreeSelectProps['treeData'] = useMemo(() => {
    if (!tags?.length) return []
    const byParent = new Map<string | null, EventTag[]>()
    for (const tag of tags) {
      const pid = tag.parent_tag_id ?? null
      const arr = byParent.get(pid) ?? []
      arr.push(tag)
      byParent.set(pid, arr)
    }
    function toNodes(parentId: string | null): NonNullable<TreeSelectProps['treeData']> {
      return (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((tag) => {
          const children = toNodes(tag.id)
          return {
            title: tag.name,
            value: tag.id,
            key: tag.id,
            ...(children.length > 0 ? { children } : {}),
          }
        })
    }
    return toNodes(null)
  }, [tags])

  const filterTagTreeNode: TreeSelectProps['filterTreeNode'] = (input, node) =>
    String(node?.title ?? '')
      .toLowerCase()
      .includes(input.trim().toLowerCase())

  async function handleCreateTag(values: TagCreateFormValues) {
    try {
      const parentId = values.parent_tag_id?.trim()
      const created = await createTagMutation.mutateAsync({
        name: values.name,
        description: values.description?.trim() ? values.description : undefined,
        active: true,
        applies_to: ['EVENT'],
        ...(parentId ? { parent_tag_id: parentId } : {}),
      })
      const currentTagIds = parentForm.getFieldValue('tag_ids') ?? []
      const nextTagIds = Array.from(new Set([...currentTagIds, created.id]))
      parentForm.setFieldsValue({ tag_ids: nextTagIds })
      onClose()
      message.success(t('events.tags.createSuccess'))
      await refetchTags()
    } catch {
      message.error(t('events.tags.createError'))
    }
  }

  return (
    <Modal
      title={t('events.tags.createModalTitle')}
      open={open}
      onCancel={onClose}
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
  )
}

import { QuestionCircleOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { Button, Divider, Form, Input, Radio, Tooltip, TreeSelect, Typography } from 'antd'
import type { TreeSelectProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateTag, useEventTags } from '@/features/events/hooks'
import { FIELD_ITEM_STYLE, tagPathLabel } from '@/features/events/shared/eventFormUtils'
import type { Tag as EventTag } from '@/shared/types/api'
import { EventCoverImageField } from './EventCoverImageField'
import { EventTagCreateModal } from './EventTagCreateModal'

type EventIdentityFieldsProps = {
  showCoverImage: boolean
  eventId?: string
}

export function EventIdentityFields({ showCoverImage, eventId }: EventIdentityFieldsProps) {
  const { t } = useTranslation()
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const { data: tags, isLoading: tagsLoading, refetch: refetchTags } = useEventTags()
  const createTagMutation = useCreateTag()

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
        : String(item),
    )
  }

  return (
    <>
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="name"
        label={t('events.form.nameLabel')}
        rules={[
          { required: true, message: t('events.form.nameRequired') },
          { max: 256, message: t('events.form.nameTooLong') },
        ]}
      >
        <Input placeholder={t('events.form.namePlaceholder')} />
      </Form.Item>

      <Form.Item style={FIELD_ITEM_STYLE} name="description" label={t('events.form.descriptionLabel')}>
        <Input.TextArea rows={4} placeholder={t('events.form.descriptionPlaceholder')} />
      </Form.Item>

      <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
        {t('events.form.sectionVisibility')}
      </Typography.Title>
      <Divider style={{ margin: '0 0 16px' }} />
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="visibility"
        label={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {t('events.form.visibilityLabel')}
            <Tooltip title={t('events.form.visibilityHelp')}>
              <span
                role="img"
                aria-label={t('events.form.visibilityHelp')}
                style={{ display: 'inline-flex', cursor: 'help', lineHeight: 0 }}
              >
                <QuestionCircleOutlined
                  style={{ color: 'var(--ant-color-text-tertiary)' }}
                  aria-hidden
                />
              </span>
            </Tooltip>
          </span>
        }
      >
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: t('events.form.visibilityPublic'), value: 'public' },
            { label: t('events.form.visibilityPrivate'), value: 'private' },
          ]}
        />
      </Form.Item>

      <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
        {t('events.form.sectionTags')}
      </Typography.Title>
      <Divider style={{ margin: '0 0 16px' }} />
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="tag_ids"
        label={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {t('events.tags.fieldLabel')}
            <Tooltip title={t('events.tags.helpText')}>
              <span
                role="img"
                aria-label={t('events.tags.helpText')}
                style={{ display: 'inline-flex', cursor: 'help', lineHeight: 0 }}
              >
                <QuestionCircleOutlined
                  style={{ color: 'var(--ant-color-text-tertiary)' }}
                  aria-hidden
                />
              </span>
            </Tooltip>
          </span>
        }
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
      <Button
        type="default"
        onClick={() => setTagModalOpen(true)}
        disabled={createTagMutation.isPending}
        style={{ marginBottom: 10 }}
      >
        {t('events.tags.createButton')}
      </Button>

      {showCoverImage && eventId ? <EventCoverImageField eventId={eventId} /> : null}
      {showCoverImage && !eventId ? (
        <Typography.Text type="secondary" style={{ display: 'block' }}>
          {t('events.form.coverAfterCreateHint')}
        </Typography.Text>
      ) : null}

      <EventTagCreateModal open={tagModalOpen} onClose={() => setTagModalOpen(false)} />
    </>
  )
}

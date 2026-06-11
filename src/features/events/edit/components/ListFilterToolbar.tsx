import { FilterOutlined } from '@ant-design/icons'
import { Badge, Button, Flex, Popover, Select, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Text } = Typography

export type ListFilterField = {
  key: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  loading?: boolean
}

export type ListFilterChip = {
  key: string
  label: ReactNode
  onRemove: () => void
}

type ListFilterToolbarProps = {
  buttonLabel: string
  clearAllLabel: string
  fields: ListFilterField[]
  chips: ListFilterChip[]
  onClearAll: () => void
  popoverWidth?: number
}

export function ListFilterToolbar({
  buttonLabel,
  clearAllLabel,
  fields,
  chips,
  onClearAll,
  popoverWidth = 280,
}: ListFilterToolbarProps) {
  const activeFilterCount = chips.length

  return (
    <Flex align="center" gap={8} wrap="wrap">
      <Popover
        trigger="click"
        placement="bottomLeft"
        content={
          <Flex vertical gap={12} style={{ width: popoverWidth }}>
            {fields.map((field) => (
              <Flex key={field.key} vertical gap={4}>
                <Text type="secondary">{field.label}</Text>
                <Select
                  style={{ width: '100%' }}
                  value={field.value}
                  options={field.options}
                  onChange={field.onChange}
                  loading={field.loading}
                  aria-label={field.label}
                />
              </Flex>
            ))}
            {activeFilterCount > 0 ? (
              <Button
                type="link"
                size="small"
                style={{ alignSelf: 'flex-start', padding: 0, height: 'auto' }}
                onClick={onClearAll}
              >
                {clearAllLabel}
              </Button>
            ) : null}
          </Flex>
        }
      >
        <Badge count={activeFilterCount} size="small">
          <Button icon={<FilterOutlined />}>{buttonLabel}</Button>
        </Badge>
      </Popover>
      {chips.map((chip) => (
        <Tag key={chip.key} closable onClose={chip.onRemove}>
          {chip.label}
        </Tag>
      ))}
    </Flex>
  )
}

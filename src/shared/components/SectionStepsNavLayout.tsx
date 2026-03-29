import { MenuOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Button, Dropdown, Flex, Grid, Steps } from 'antd'
import { useMemo, type ReactNode } from 'react'

export type SectionNavItem<K extends string = string> = {
  key: K
  icon: ReactNode
  label: string
}

export type SectionStepsNavLayoutProps<K extends string> = {
  sectionOrder: readonly K[]
  items: SectionNavItem<K>[]
  activeKey: K
  onActiveKeyChange: (key: K) => void
  menuDropdownAriaLabel: string
  children: ReactNode
}

export function SectionStepsNavLayout<K extends string>({
  sectionOrder,
  items,
  activeKey,
  onActiveKeyChange,
  menuDropdownAriaLabel,
  children,
}: SectionStepsNavLayoutProps<K>) {
  const screens = Grid.useBreakpoint()
  const compactNav = screens.md === false
  const stepIndex = Math.max(0, sectionOrder.indexOf(activeKey))

  const itemByKey = useMemo(() => new Map(items.map((x) => [x.key, x])), [items])

  const wideStepItems = useMemo(
    () =>
      sectionOrder.map((key) => {
        const m = itemByKey.get(key)
        return {
          title: m?.label ?? key,
          icon: m?.icon,
        }
      }),
    [sectionOrder, itemByKey],
  )

  const compactStepItems = useMemo(
    () =>
      sectionOrder.map((sectionKey, index) => {
        const m = itemByKey.get(sectionKey)
        const label = m?.label ?? sectionKey
        const isFirst = index === 0
        const isLast = index === sectionOrder.length - 1
        return {
          title: null,
          icon: (
            <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-label={label}>
              {m?.icon}
            </span>
          ),
          style: {
            flex: '1 1 0%',
            minWidth: 0,
            maxWidth: '100%',
            display: 'flex',
            justifyContent: 'center',
            paddingInlineStart: isFirst ? 0 : 6,
            paddingInlineEnd: isLast ? 0 : 6,
          },
          styles: {
            wrapper: {
              flex: 1,
              minWidth: 0,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 0,
            },
            section: { flex: '0 0 auto', minWidth: 0, maxWidth: 'max-content' },
            header: { gap: 0, justifyContent: 'center' },
            rail: { marginInlineStart: 6 },
          },
        }
      }),
    [sectionOrder, itemByKey],
  )

  const dropdownMenuItems: MenuProps['items'] = useMemo(
    () => items.map(({ key, icon, label }) => ({ key, icon, label })),
    [items],
  )

  return (
    <Flex vertical gap={compactNav ? 12 : 0} style={{ width: '100%' }}>
      {compactNav ? (
        <Flex align="center" gap={16} style={{ width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0, overflowX: 'visible', paddingBottom: 4 }}>
            <Steps
              className="event-form-compact-steps"
              style={{ width: '100%' }}
              size="small"
              type="navigation"
              orientation="horizontal"
              responsive={false}
              current={stepIndex}
              items={compactStepItems}
              onChange={(step) => onActiveKeyChange(sectionOrder[step])}
            />
          </div>
          <span style={{ display: 'inline-flex', flexShrink: 0 }}>
            <Dropdown
              menu={{
                items: dropdownMenuItems,
                selectedKeys: [activeKey],
                onClick: ({ key }) => onActiveKeyChange(key as K),
              }}
              trigger={['hover', 'click']}
              placement="bottomRight"
            >
              <Button type="text" icon={<MenuOutlined />} aria-label={menuDropdownAriaLabel} />
            </Dropdown>
          </span>
        </Flex>
      ) : null}
      <Flex gap={32} align="flex-start" style={{ width: '100%' }}>
        <Flex vertical style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {children}
        </Flex>
        {!compactNav ? (
          <div style={{ width: 220, flexShrink: 0 }}>
            <Steps
              className="event-form-wide-steps"
              orientation="vertical"
              size="small"
              responsive={false}
              current={stepIndex}
              items={wideStepItems}
              onChange={(step) => onActiveKeyChange(sectionOrder[step])}
            />
          </div>
        ) : null}
      </Flex>
    </Flex>
  )
}

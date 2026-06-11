import { MenuOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Button, Dropdown, Flex, Grid, Menu, Steps } from 'antd'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

export type SectionNavItem<K extends string = string> = {
  key: K
  icon: ReactNode
  label: string
}

export type SectionSubNavItem = {
  key: string
  label: string
  icon?: ReactNode
}

export type SectionStepsNavLayoutProps<K extends string> = {
  sectionOrder: readonly K[]
  items: SectionNavItem<K>[]
  activeKey: K
  onActiveKeyChange: (key: K) => void
  menuDropdownAriaLabel: string
  navMode?: 'progress' | 'menu'
  subNavBySection?: Partial<Record<K, SectionSubNavItem[]>>
  activeSubKey?: string | null
  onSubNavClick?: (sectionKey: K, subKey: string) => void
  subNavParentClickBySection?: Partial<Record<K, () => void>>
  children: ReactNode
}

export function SectionStepsNavLayout<K extends string>({
  sectionOrder,
  items,
  activeKey,
  onActiveKeyChange,
  menuDropdownAriaLabel,
  navMode = 'progress',
  subNavBySection,
  activeSubKey,
  onSubNavClick,
  subNavParentClickBySection,
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
        const item = {
          title: m?.label ?? key,
          icon: m?.icon,
          ...(navMode === 'menu'
            ? { status: key === activeKey ? ('process' as const) : ('wait' as const) }
            : {}),
        }
        return item
      }),
    [sectionOrder, itemByKey, navMode, activeKey],
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
          ...(navMode === 'menu'
            ? { status: sectionKey === activeKey ? ('process' as const) : ('wait' as const) }
            : {}),
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
    [sectionOrder, itemByKey, navMode, activeKey],
  )

  const dropdownMenuItems: MenuProps['items'] = useMemo(
    () =>
      items.map(({ key, icon, label }) => {
        const subs = subNavBySection?.[key]
        if (subs?.length) {
          return {
            key,
            icon,
            label,
            children: subs.map((sub) => ({
              key: `${key}:${sub.key}`,
              icon: sub.icon,
              label: sub.label,
            })),
          }
        }
        return { key, icon, label }
      }),
    [items, subNavBySection],
  )

  const wideMenuItems = useMemo((): MenuProps['items'] => {
    if (navMode !== 'menu') return []
    return sectionOrder.map((key) => {
      const m = itemByKey.get(key)
      const subs = subNavBySection?.[key]
      if (subs?.length) {
        const parentLabel = m?.label ?? key
        const onParentClick = subNavParentClickBySection?.[key]
        return {
          key,
          icon: m?.icon,
          label: onParentClick ? (
            <span
              role="link"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                onParentClick()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onParentClick()
                }
              }}
            >
              {parentLabel}
            </span>
          ) : (
            parentLabel
          ),
          children: subs.map((sub) => ({
            key: `${key}:${sub.key}`,
            icon: sub.icon,
            label: sub.label,
          })),
        }
      }
      return {
        key,
        icon: m?.icon,
        label: m?.label ?? key,
      }
    })
  }, [itemByKey, navMode, sectionOrder, subNavBySection, subNavParentClickBySection])

  const wideMenuSelectedKeys = useMemo(() => {
    if (activeSubKey && subNavBySection?.[activeKey]?.length) {
      return [`${activeKey}:${activeSubKey}`]
    }
    return [activeKey]
  }, [activeKey, activeSubKey, subNavBySection])

  const wideMenuOpenKeys = useMemo(() => {
    const keys: string[] = []
    for (const key of sectionOrder) {
      if (subNavBySection?.[key]?.length) keys.push(key)
    }
    return keys
  }, [sectionOrder, subNavBySection])

  const [menuOpenKeys, setMenuOpenKeys] = useState(wideMenuOpenKeys)

  useEffect(() => {
    if (activeSubKey && subNavBySection?.[activeKey]?.length) {
      setMenuOpenKeys((prev) => (prev.includes(activeKey) ? prev : [...prev, activeKey]))
    }
  }, [activeSubKey, activeKey, subNavBySection])

  const wideStepsClassName =
    navMode === 'menu' ? 'event-form-wide-steps event-form-wide-steps-menu' : 'event-form-wide-steps'
  const compactStepsClassName =
    navMode === 'menu' ? 'event-form-compact-steps event-form-compact-steps-menu' : 'event-form-compact-steps'

  return (
    <Flex vertical gap={compactNav ? 12 : 0} style={{ width: '100%' }}>
      {compactNav ? (
        <Flex align="center" gap={16} style={{ width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0, overflowX: 'visible', paddingBottom: 4 }}>
            <Steps
              className={compactStepsClassName}
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
                selectedKeys: [
                  activeKey,
                  ...(activeSubKey ? [`${activeKey}:${activeSubKey}`] : []),
                ],
                onClick: ({ key }) => {
                  const keyStr = String(key)
                  const colon = keyStr.indexOf(':')
                  if (colon > 0 && onSubNavClick) {
                    onSubNavClick(keyStr.slice(0, colon) as K, keyStr.slice(colon + 1))
                    return
                  }
                  onActiveKeyChange(keyStr as K)
                },
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
            {navMode === 'menu' && subNavBySection ? (
              <Menu
                className="event-form-section-menu"
                mode="inline"
                inlineIndent={0}
                selectedKeys={wideMenuSelectedKeys}
                openKeys={menuOpenKeys}
                onOpenChange={setMenuOpenKeys}
                items={wideMenuItems}
                onClick={({ key }) => {
                  const keyStr = String(key)
                  const colon = keyStr.indexOf(':')
                  if (colon > 0 && onSubNavClick) {
                    onSubNavClick(keyStr.slice(0, colon) as K, keyStr.slice(colon + 1))
                    return
                  }
                  onActiveKeyChange(keyStr as K)
                }}
              />
            ) : (
              <Steps
                className={wideStepsClassName}
                orientation="vertical"
                size="small"
                responsive={false}
                current={stepIndex}
                items={wideStepItems}
                onChange={(step) => onActiveKeyChange(sectionOrder[step])}
              />
            )}
          </div>
        ) : null}
      </Flex>
    </Flex>
  )
}

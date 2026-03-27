import { LinkOutlined } from '@ant-design/icons'
import type { BreadcrumbProps } from 'antd'
import { Breadcrumb, Button, Flex, Tooltip, message } from 'antd'
import { useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

function CopyPageLinkButton() {
  const { t } = useTranslation()

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      message.success(t('shell.copyPageLinkSuccess'))
    } catch {
      message.error(t('shell.copyPageLinkError'))
    }
  }, [t])

  return (
    <Tooltip title={t('shell.copyPageLink')} placement="bottom">
      <Button
        type="text"
        size="small"
        icon={<LinkOutlined />}
        aria-label={t('shell.copyPageLink')}
        onClick={() => void onCopy()}
        style={{ flexShrink: 0 }}
      />
    </Tooltip>
  )
}

type PageBreadcrumbBarProps = {
  items: BreadcrumbProps['items']
  marginBottom?: number
  trailing?: ReactNode
}

export function PageBreadcrumbBar({ items, marginBottom = 24, trailing }: PageBreadcrumbBarProps) {
  const breadcrumbEl = <Breadcrumb style={{ marginBottom: 0 }} items={items} />

  const crumbAndLink = (
    <>
      {breadcrumbEl}
      <CopyPageLinkButton />
    </>
  )

  if (trailing) {
    return (
      <Flex justify="space-between" align="center" gap={12} style={{ marginBottom }} wrap="wrap">
        <Flex align="center" gap={8} wrap="wrap" style={{ minWidth: 0, flex: 1 }}>
          {crumbAndLink}
        </Flex>
        {trailing}
      </Flex>
    )
  }

  return (
    <Flex align="center" gap={8} style={{ marginBottom }} wrap="wrap">
      {crumbAndLink}
    </Flex>
  )
}

import { Button, Card, Flex } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type EditTabShellProps = {
  children: ReactNode
  showSave?: boolean
  dirty?: boolean
  loading?: boolean
  onSave?: () => void
}

export function EditTabShell({
  children,
  showSave = true,
  dirty = false,
  loading = false,
  onSave,
}: EditTabShellProps) {
  const { t } = useTranslation()

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ width: '100%' }}>{children}</div>
      {showSave ? (
        <Flex justify="flex-end" style={{ width: '100%', marginTop: 16 }}>
          <Button
            type="primary"
            loading={loading}
            disabled={!dirty}
            onClick={() => onSave?.()}
          >
            {t('events.edit.submit')}
          </Button>
        </Flex>
      ) : null}
    </Card>
  )
}

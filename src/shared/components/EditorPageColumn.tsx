import { Flex } from 'antd'
import type { ReactNode } from 'react'
import { EDITOR_PAGE_SHELL } from '@/shared/editorPageShell'

export type EditorPageColumnProps = {
  children: ReactNode
  gap?: number
}

export function EditorPageColumn({ children, gap }: EditorPageColumnProps) {
  return (
    <Flex vertical gap={gap} style={EDITOR_PAGE_SHELL}>
      {children}
    </Flex>
  )
}

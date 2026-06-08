import { Flex } from 'antd'
import type { ReactNode } from 'react'
import './eventGuestFlowActions.css'

type Props = {
  children: ReactNode
  stacked?: boolean
}

export function GuestFlowActions({ children, stacked = false }: Props) {
  return (
    <Flex
      gap={12}
      wrap="wrap"
      justify="center"
      className={`guest-flow-actions${stacked ? ' guest-flow-actions--stacked' : ''}`}
    >
      {children}
    </Flex>
  )
}

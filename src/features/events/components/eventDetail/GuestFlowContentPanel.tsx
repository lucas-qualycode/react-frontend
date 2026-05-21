import { Flex } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { guestPanelContentStyle, guestPanelShellClassName, guestPanelShellStyle } from './guestPanelLayout'
import './eventGuestFlowContent.css'

type Props = {
  children: ReactNode
  gap?: number
  innerStyle?: CSSProperties
  /** Stable min-height for gift/payment/message slides; confirm uses fit. */
  panelSize?: 'fit' | 'stable'
}

export function GuestFlowContentPanel({ children, gap = 24, innerStyle, panelSize = 'stable' }: Props) {
  const boxClassName =
    panelSize === 'stable'
      ? 'guest-flow-content-box guest-flow-content-box--stable'
      : 'guest-flow-content-box'

  return (
    <div className={guestPanelShellClassName} style={guestPanelShellStyle}>
      <div className={boxClassName} style={guestPanelContentStyle}>
        <Flex
          vertical
          align="center"
          gap={gap}
          className="guest-flow-content-box-inner"
          style={{ width: '100%', ...innerStyle }}
        >
          {children}
        </Flex>
      </div>
    </div>
  )
}

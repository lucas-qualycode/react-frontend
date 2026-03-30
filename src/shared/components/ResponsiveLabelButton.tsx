import { Button, Tooltip } from 'antd'
import type { ButtonProps } from 'antd'
import type { ReactNode } from 'react'

export type ResponsiveLabelButtonProps = Omit<ButtonProps, 'children'> & {
  iconOnly: boolean
  tooltipTitle: string
  children: ReactNode
}

export function ResponsiveLabelButton({
  iconOnly,
  tooltipTitle,
  children,
  icon,
  'aria-label': ariaLabel,
  ...rest
}: ResponsiveLabelButtonProps) {
  const button = (
    <Button
      {...rest}
      icon={icon}
      aria-label={iconOnly ? (ariaLabel ?? tooltipTitle) : ariaLabel}
    >
      {iconOnly ? undefined : children}
    </Button>
  )
  if (iconOnly) {
    return (
      <Tooltip title={tooltipTitle} placement="bottom">
        <span style={{ display: 'inline-flex' }}>{button}</span>
      </Tooltip>
    )
  }
  return button
}

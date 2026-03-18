import { useState } from 'react'
import { Link } from 'react-router-dom'
import { theme } from 'antd'

type AuthFooterLinkProps = { to: string; children: React.ReactNode }

export function AuthFooterLink({ to, children }: AuthFooterLinkProps) {
  const { token } = theme.useToken()
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      to={to}
      style={{
        color: hovered ? token.colorPrimaryHover : token.colorPrimary,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  )
}

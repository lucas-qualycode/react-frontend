import { type ButtonHTMLAttributes, type ReactNode } from 'react'

const BASE_CLASS =
  'inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-muted transition-colors hover:bg-secondary hover:text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  children: ReactNode
}

export function IconButton({ className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${BASE_CLASS} ${className}`}
      {...props}
    />
  )
}

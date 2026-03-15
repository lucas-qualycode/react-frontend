interface AvatarProps {
  name: string
  className?: string
  title?: string
}

export function Avatar({ name, className = '', title }: AvatarProps) {
  const initial = (name || 'U').charAt(0).toUpperCase()
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ${className}`}
      title={title}
    >
      {initial}
    </div>
  )
}

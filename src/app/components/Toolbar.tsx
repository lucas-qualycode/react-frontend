import { Link } from 'react-router-dom'
import { useAuth } from '@/app/auth/AuthContext'
import { SearchIcon, CartIcon, HeartIcon } from '@/shared/components/icons'
import { Avatar } from '@/shared/components/Avatar'

const BRAND_NAME = 'Partiiu.com'

const NAV_ICONS = [
  { to: '/favorites', label: 'Favorites', icon: HeartIcon, withSpacer: true },
  { to: '/orders', label: 'Cart', icon: CartIcon, withSpacer: false },
] as const

const ICON_LINK_CLASS =
  'rounded-lg p-2 text-muted hover:bg-secondary hover:text-secondary-foreground'

export function Toolbar() {
  const { user } = useAuth()
  const displayName = user?.displayName ?? user?.email ?? ''

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          {BRAND_NAME}
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <div className="group flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-1.5 transition-colors hover:border-input-focus focus-within:border-input-focus focus-within:bg-white focus-within:ring-1 focus-within:ring-input-focus">
            <input
              id="toolbar-search"
              type="search"
              placeholder="Search"
              className="w-32 bg-transparent text-sm text-gray-800 placeholder-gray-500 outline-none sm:w-40 md:w-48"
              aria-label="Search"
            />
            <label
              htmlFor="toolbar-search"
              className="flex shrink-0 cursor-pointer text-muted transition-colors group-hover:text-secondary-foreground group-focus-within:text-secondary-foreground"
              aria-hidden
            >
              <SearchIcon />
            </label>
          </div>
          {NAV_ICONS.map(({ to, label, icon: Icon, withSpacer }) => (
            <Link
              key={to}
              to={to}
              className={`${ICON_LINK_CLASS} ${withSpacer ? 'ml-3' : ''}`}
              aria-label={label}
            >
              <Icon />
            </Link>
          ))}
          {user ? (
            <Avatar
              name={displayName}
              className="ml-3 h-9 w-9"
              title={user.email ?? undefined}
            />
          ) : (
            <Link
              to="/login"
              className="ml-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Button, Dropdown, Flex, Input, Popover, theme } from 'antd'
import type { MenuProps } from 'antd'
import { useAuth } from '@/app/auth/AuthContext'
import { AuthFooterLink } from '@/features/auth/AuthFooterLink'
import { SearchIcon, CartIcon, HeartIcon } from '@/shared/components/icons'

const BRAND_NAME = 'Partiiu.com'

const NAV_ICONS = [
  { to: '/favorites', label: 'Favorites', icon: HeartIcon },
  { to: '/orders', label: 'Cart', icon: CartIcon },
] as const

const SEARCH_INPUT_WIDTH = 256
const NAV_WIDTH_FIT_INPUT = 400

export function AppHeader() {
  const { user, signOut } = useAuth()
  const { token } = theme.useToken()
  const navRef = useRef<HTMLElement>(null)
  const searchTriggerRef = useRef<HTMLSpanElement>(null)
  const [navWidth, setNavWidth] = useState(0)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const [hoveredBrand, setHoveredBrand] = useState(false)
  const [hoveredSearch, setHoveredSearch] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const displayName = user?.displayName ?? user?.email ?? ''
  const initial = (displayName || 'U').charAt(0).toUpperCase()
  const searchInNav = navWidth >= NAV_WIDTH_FIT_INPUT

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setNavWidth(entry.contentRect.width))
    ro.observe(el)
    setNavWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!searchOpen || searchInNav) return
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (searchTriggerRef.current?.contains(target)) return
      if ((e.target as Element).closest?.('.ant-popover')) return
      closeSearch()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [searchOpen, searchInNav])

  useEffect(() => {
    if (!searchOpen || searchInNav) return
    const t = setTimeout(() => {
      const el = document.getElementById('app-header-search-popover')
      const input = el?.querySelector?.('input') ?? (el as HTMLInputElement | null)
      if (input && 'focus' in input) (input as HTMLInputElement).focus()
    }, 100)
    return () => clearTimeout(t)
  }, [searchOpen, searchInNav])

  function openSearch() {
    setSearchOpen(true)
  }

  function closeSearch() {
    setSearchOpen(false)
    setHoveredSearch(false)
  }

  const accountMenuItems: MenuProps['items'] = [
    {
      key: 'signout',
      label: 'Finalizar sessão',
      onClick: () => signOut(),
    },
  ]

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: `1px solid ${token.colorBorder ?? '#e5e7eb'}`,
        padding: '8px 16px',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      }}
    >
      <Flex justify="space-between" align="center" style={{ maxWidth: 1152, margin: '0 auto', width: '100%' }}>
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: hoveredBrand ? token.colorPrimaryHover : token.colorPrimary,
            fontWeight: 600,
            fontSize: 18,
            flexShrink: 0,
          }}
          onMouseEnter={() => setHoveredBrand(true)}
          onMouseLeave={() => setHoveredBrand(false)}
        >
          {BRAND_NAME}
        </Link>
        <nav ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1, justifyContent: 'flex-end' }} aria-label="Main">
          {searchOpen && searchInNav ? (
            <Input
              id="app-header-search"
              type="search"
              placeholder="Search"
              prefix={<SearchIcon />}
              style={{ width: SEARCH_INPUT_WIDTH }}
              aria-label="Search"
              variant="outlined"
              autoFocus
              onBlur={closeSearch}
              onKeyDown={(e) => { if (e.key === 'Escape') closeSearch() }}
            />
          ) : (
            <Popover
              open={searchOpen && !searchInNav}
              onOpenChange={(open) => { if (!open) closeSearch() }}
              trigger={[]}
              placement="bottomRight"
              content={
                <Input
                  id="app-header-search-popover"
                  type="search"
                  placeholder="Search"
                  prefix={<SearchIcon />}
                  style={{ width: SEARCH_INPUT_WIDTH }}
                  aria-label="Search"
                  variant="outlined"
                />
              }
            >
              <span
                ref={searchTriggerRef}
                role="button"
                tabIndex={0}
                aria-label="Search"
                aria-expanded={searchOpen}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: (hoveredSearch || (searchOpen && !searchInNav)) ? token.colorPrimary : token.colorTextSecondary,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredSearch(true)}
                onMouseLeave={() => setHoveredSearch(false)}
                onClick={openSearch}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSearch() } }}
              >
                <SearchIcon />
              </span>
            </Popover>
          )}
          {NAV_ICONS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              style={{
                color: hoveredNav === to ? token.colorPrimary : token.colorTextSecondary,
                padding: 8,
                borderRadius: 8,
                display: 'inline-flex',
              }}
              onMouseEnter={() => setHoveredNav(to)}
              onMouseLeave={() => setHoveredNav(null)}
              aria-label={label}
            >
              <Icon />
            </Link>
          ))}
          {user ? (
            <Dropdown
              menu={{ items: accountMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="primary"
                style={{
                  marginLeft: 12,
                  padding: 0,
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-expanded={false}
                aria-haspopup="true"
                aria-label="Conta"
              >
                <Avatar size={36}>{initial}</Avatar>
              </Button>
            </Dropdown>
          ) : (
            <Flex align="center" gap={12} style={{ marginLeft: 12 }}>
              <span style={{ fontSize: 14, color: token.colorTextSecondary, lineHeight: 1.4, whiteSpace: 'pre-line', textAlign: 'right' }}>
                {'Don\'t have an account?\n'}
                <AuthFooterLink to="/signup">Sign up</AuthFooterLink>
              </span>
              <Link to="/signin">
                <Button type="primary">Sign in</Button>
              </Link>
            </Flex>
          )}
        </nav>
      </Flex>
    </header>
  )
}

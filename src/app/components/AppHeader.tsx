import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Button, Dropdown, Flex, Grid, Input, Popover, theme } from 'antd'
import type { MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthContext'
import { AuthFooterLink } from '@/features/auth/AuthFooterLink'
import { HeartOutlined, LoginOutlined, MenuOutlined, SearchOutlined, SettingOutlined, ShoppingCartOutlined, UserAddOutlined } from '@ant-design/icons'

const SEARCH_INPUT_WIDTH = 256
const NAV_WIDTH_FIT_INPUT = 400

export function AppHeader() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navIcons = useMemo(
    () =>
      [
        { to: '/favorites' as const, labelKey: 'shell.favorites' as const, icon: HeartOutlined },
        { to: '/orders' as const, labelKey: 'shell.cart' as const, icon: ShoppingCartOutlined },
      ] as const,
    []
  )
  const { token } = theme.useToken()
  const navRef = useRef<HTMLElement>(null)
  const searchTriggerRef = useRef<HTMLSpanElement>(null)
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const [navWidth, setNavWidth] = useState(0)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const [hoveredBrand, setHoveredBrand] = useState(false)
  const [hoveredSearch, setHoveredSearch] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const displayName = user?.displayName ?? user?.email ?? ''
  const initial = (displayName || 'U').charAt(0).toUpperCase()
  const searchInNav = navWidth >= NAV_WIDTH_FIT_INPUT
  const signedOutNarrow = !!screens.xs
  const [hoveredMenu, setHoveredMenu] = useState(false)

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
      key: 'settings',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined style={{ fontSize: 18 }} />
          {t('shell.settings')}
        </span>
      ),
      onClick: () => navigate('/settings/profile'),
    },
    {
      key: 'signout',
      label: t('shell.signOut'),
      onClick: () => signOut(),
    },
  ]

  const unauthMenuItems: MenuProps['items'] = [
    {
      key: 'favorites',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <HeartOutlined style={{ fontSize: 18 }} />
          {t('shell.favorites')}
        </span>
      ),
      onClick: () => navigate('/favorites'),
    },
    {
      key: 'signin',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <LoginOutlined style={{ fontSize: 18 }} />
          {t('shell.signIn')}
        </span>
      ),
      onClick: () => navigate('/signin'),
    },
    {
      key: 'signup',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <UserAddOutlined style={{ fontSize: 18 }} />
          {t('shell.signUp')}
        </span>
      ),
      onClick: () => navigate('/signup'),
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
          {t('shell.brand')}
        </Link>
        <nav
          ref={navRef}
          style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1, justifyContent: 'flex-end' }}
          aria-label={t('shell.mainNav')}
        >
          {searchOpen && searchInNav ? (
            <Input
              id="app-header-search"
              type="search"
              placeholder={t('shell.search')}
              prefix={<SearchOutlined style={{ fontSize: 18 }} />}
              style={{ width: SEARCH_INPUT_WIDTH }}
              aria-label={t('shell.searchAria')}
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
                  placeholder={t('shell.search')}
                  prefix={<SearchOutlined style={{ fontSize: 18 }} />}
                  style={{ width: SEARCH_INPUT_WIDTH }}
                  aria-label={t('shell.searchAria')}
                  variant="outlined"
                />
              }
            >
              <span
                ref={searchTriggerRef}
                role="button"
                tabIndex={0}
                aria-label={t('shell.searchAria')}
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
                <SearchOutlined style={{ fontSize: 20 }} />
              </span>
            </Popover>
          )}
          {navIcons.map(({ to, labelKey, icon: Icon }) => {
            if (!user && signedOutNarrow && to === '/favorites') return null
            return (
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
                aria-label={t(labelKey)}
              >
                <Icon style={{ fontSize: 20 }} />
              </Link>
            )
          })}
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
                aria-label={t('shell.account')}
              >
                <Avatar size={36}>{initial}</Avatar>
              </Button>
            </Dropdown>
          ) : (
            signedOutNarrow ? (
              <Dropdown menu={{ items: unauthMenuItems }} trigger={['click']} placement="bottomRight">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t('shell.menu')}
                  style={{
                    marginLeft: 12,
                    padding: 8,
                    borderRadius: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: hoveredMenu ? token.colorPrimary : token.colorTextSecondary,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredMenu(true)}
                  onMouseLeave={() => setHoveredMenu(false)}
                >
                  <MenuOutlined style={{ fontSize: 18 }} />
                </span>
              </Dropdown>
            ) : (
              <Flex align="center" gap={12} style={{ marginLeft: 12 }}>
                <span
                  style={{
                    fontSize: 14,
                    color: token.colorTextSecondary,
                    lineHeight: 1.4,
                    whiteSpace: 'pre-line',
                    textAlign: 'right',
                  }}
                >
                  {`${t('shell.noAccount')}\n`}
                  <AuthFooterLink to="/signup">{t('shell.signUpLink')}</AuthFooterLink>
                </span>
                <Link to="/signin">
                  <Button type="primary">{t('shell.signIn')}</Button>
                </Link>
              </Flex>
            )
          )}
        </nav>
      </Flex>
    </header>
  )
}

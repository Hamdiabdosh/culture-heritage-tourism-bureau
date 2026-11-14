'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Building2,
  CalendarDays,
  FileText,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { BuiltByRaafat } from '@/src/components/brand/built-by-raafat'
import { LanguageSwitcher } from '@/components/language-switcher'
import { authClient } from '@/lib/auth-client'
import type { AppRole } from '@/lib/db/schema'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

type NavKey =
  | 'overview'
  | 'pages'
  | 'news'
  | 'services'
  | 'events'
  | 'documents'
  | 'users'
  | 'publicWebsite'

type GroupKey = 'workspace' | 'content' | 'administration' | 'website'

type NavItem = {
  href: string
  key: NavKey
  icon: typeof LayoutDashboard
  group: GroupKey
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/cms', key: 'overview', icon: LayoutDashboard, group: 'workspace' },
  { href: '/cms/content', key: 'pages', icon: FileText, group: 'content' },
  { href: '/cms/news', key: 'news', icon: Newspaper, group: 'content' },
  { href: '/cms/services', key: 'services', icon: Building2, group: 'content' },
  { href: '/cms/events', key: 'events', icon: CalendarDays, group: 'content' },
  { href: '/cms/documents', key: 'documents', icon: FolderOpen, group: 'content' },
  { href: '/cms/users', key: 'users', icon: Users, group: 'administration', adminOnly: true },
  { href: '/', key: 'publicWebsite', icon: Globe2, group: 'website' },
]

function isNavActive(pathname: string, href: string) {
  if (href === '/') return false
  if (href === '/cms') return pathname === '/cms'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function breadcrumbFor(pathname: string): { section: GroupKey; page: NavKey | 'cmsFallback' } {
  if (pathname === '/cms') return { section: 'workspace', page: 'overview' }
  if (pathname.startsWith('/cms/content')) return { section: 'content', page: 'pages' }
  if (pathname.startsWith('/cms/news')) return { section: 'content', page: 'news' }
  if (pathname.startsWith('/cms/services')) return { section: 'content', page: 'services' }
  if (pathname.startsWith('/cms/events')) return { section: 'content', page: 'events' }
  if (pathname.startsWith('/cms/documents')) return { section: 'content', page: 'documents' }
  if (pathname.startsWith('/cms/users')) return { section: 'administration', page: 'users' }
  return { section: 'workspace', page: 'cmsFallback' }
}

function Sidebar({
  open,
  close,
  pathname,
  institutionName,
  institutionShortName,
  role,
}: {
  open: boolean
  close: () => void
  pathname: string
  institutionName: string
  institutionShortName: string
  role: AppRole
}) {
  const t = useTranslations('cms.navigation')
  let lastGroup: GroupKey | null = null
  const visibleNav = navItems.filter((item) => !item.adminOnly || role === 'admin')

  return (
    <aside className={`cms-sidebar ${open ? 'is-open' : ''}`}>
      <div className="cms-brand">
        <span className="cms-brand-mark">
          <ShieldCheck />
        </span>
        <span>
          <strong>
            {institutionShortName} {t('cmsSuffix')}
          </strong>
          <small>{t('contentWorkspace')}</small>
        </span>
        <button className="cms-close" onClick={close} aria-label={t('closeNav')}>
          <X />
        </button>
      </div>
      <div className="cms-workspace">
        <span className="cms-avatar">{initials(institutionShortName)}</span>
        <span>
          <strong>{institutionName}</strong>
          <small>{t('activeInstitution')}</small>
        </span>
      </div>
      <nav className="cms-nav" aria-label={t('ariaNav')}>
        {visibleNav.map((item) => {
          const Icon = item.icon
          const showLabel = item.group !== lastGroup
          lastGroup = item.group
          const active = isNavActive(pathname, item.href)
          return (
            <span key={item.href} className="cms-nav-item-wrap">
              {showLabel ? <span className="cms-nav-label">{t(item.group)}</span> : null}
              <Link
                href={item.href}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={close}
              >
                <Icon /> {t(item.key)}
              </Link>
            </span>
          )
        })}
      </nav>
      <div className="cms-sidebar-foot">
        <BuiltByRaafat
          className="cms-sidebar-credit"
          linkClassName="cms-sidebar-credit-link"
        />
      </div>
    </aside>
  )
}

export function CmsShell({
  userName,
  role,
  institutionName,
  institutionShortName,
  children,
}: {
  userName: string
  role: AppRole
  institutionName: string
  institutionShortName: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('cms.navigation')
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const roleLabel =
    role === 'admin' ? t('roleAdmin') : role === 'editor' ? t('roleEditor') : t('roleViewer')
  const crumb = breadcrumbFor(pathname)

  async function onSignOut() {
    setSignOutError(null)
    setSigningOut(true)

    const result = await authClient.signOut()

    if (result.error) {
      setSigningOut(false)
      setSignOutError(result.error.message || t('signOutError'))
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="cms-shell">
      <Sidebar
        open={menuOpen}
        close={() => setMenuOpen(false)}
        pathname={pathname}
        institutionName={institutionName}
        institutionShortName={institutionShortName}
        role={role}
      />
      {menuOpen ? (
        <button
          className="cms-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label={t('closeNav')}
        />
      ) : null}
      <div className="cms-main">
        <header className="cms-topbar">
          <button
            className="cms-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('openNav')}
          >
            <Menu />
          </button>
          <div className="cms-breadcrumb">
            <span>{t(crumb.section)}</span>
            <b>/</b>
            <strong>{t(crumb.page)}</strong>
          </div>
          <div className="cms-top-actions">
            <LanguageSwitcher className="cms-lang-switcher" />
            <span className="cms-user-avatar">{initials(userName)}</span>
            <span className="cms-user-name">
              {userName} · {roleLabel}
            </span>
            <button
              type="button"
              className="cms-sign-out"
              onClick={onSignOut}
              disabled={signingOut}
            >
              <LogOut aria-hidden="true" />
              <span>{signingOut ? t('signingOut') : t('signOut')}</span>
            </button>
          </div>
        </header>
        {signOutError ? (
          <p className="cms-form-error cms-sign-out-error" role="alert">
            {signOutError}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  )
}

import { useEffect, useId, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  authApi,
  institutionApi,
  type Institution,
  type SessionUser,
} from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'
import { siteTemplate } from '../../lib/site-template'
import { BrandLogo } from '../brand/brand-logo'
import { BuiltByRaafat } from '../brand/built-by-raafat'
import { LanguageSwitcher } from '../LanguageSwitcher'
import '../../styles/cms.css'

export type CmsOutletContext = {
  user: SessionUser
  institution: Institution | null
  canWrite: boolean
}

export function CmsLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const tNav = useT('cms.navigation')
  const tCommon = useT('cms.common')
  const tFooter = useT('footer')
  const menuId = useId()
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    authApi
      .session()
      .then(async ({ user: sessionUser }) => {
        if (cancelled) return
        if (!sessionUser) {
          navigate('/login?next=/cms', { replace: true })
          return
        }
        setUser(sessionUser)
        try {
          setInstitution(await institutionApi.get())
        } catch {
          setInstitution(null)
        }
      })
      .catch(() => {
        if (!cancelled) navigate('/login?next=/cms', { replace: true })
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  async function signOut() {
    await authApi.logout()
    navigate('/login', { replace: true })
  }

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  const shortName = institution?.shortName ?? siteTemplate.fallbackShortName
  useDocumentTitle(formatDocumentTitle(tNav('cmsSuffix'), officeName))

  if (user === undefined) {
    return (
      <div className="cms-shell">
        <p className="cms-muted" style={{ padding: 32 }}>
          {tCommon('checkingSession')}
        </p>
      </div>
    )
  }

  if (!user) return null

  const canWrite = user.role === 'admin' || user.role === 'editor'
  const roleLabel =
    user.role === 'admin'
      ? tNav('roleAdmin')
      : user.role === 'editor'
        ? tNav('roleEditor')
        : tNav('roleViewer')

  const nav = [
    { to: '/cms', label: tNav('overview'), end: true },
    { to: '/cms/news', label: tNav('news') },
    { to: '/cms/content', label: tNav('pages') },
    { to: '/cms/services', label: tNav('services') },
    { to: '/cms/events', label: tNav('events') },
    { to: '/cms/documents', label: tNav('documents') },
    { to: '/cms/settings', label: tNav('settings') },
    { to: '/cms/users', label: tNav('users'), adminOnly: true as const },
  ]

  const visible = nav.filter((item) => !item.adminOnly || user.role === 'admin')

  return (
    <div className="cms-shell">
      {menuOpen ? (
        <button
          type="button"
          className="cms-scrim"
          aria-label={tNav('closeNav')}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside className={`cms-sidebar${menuOpen ? ' is-open' : ''}`} id={menuId}>
        <div className="cms-brand">
          <BrandLogo className="cms-brand-logo" size={34} />
          <span>
            <strong>
              {shortName} {tNav('cmsSuffix')}
            </strong>
            <small>{tNav('contentWorkspace')}</small>
          </span>
        </div>
        <nav className="cms-nav" aria-label={tNav('ariaNav')}>
          {visible.map((item) => (
            <NavLink key={item.to} to={item.to} end={Boolean(item.end)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="cms-sidebar-foot">
          <p>
            {user.name} · {roleLabel}
          </p>
          <button type="button" className="cms-ghost" onClick={signOut}>
            {tNav('signOut')}
          </button>
          <BuiltByRaafat
            className="cms-sidebar-credit"
            linkClassName="cms-sidebar-credit-link"
            prefix={tFooter('builtBy')}
          />
        </div>
      </aside>
      <div className="cms-main">
        <header className="cms-topbar">
          <div className="cms-topbar-start">
            <button
              type="button"
              className="cms-menu-button"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? tNav('closeNav') : tNav('openNav')}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
            </button>
            <Link to="/">{tNav('publicWebsite')}</Link>
          </div>
          <LanguageSwitcher className="cms-lang-switcher" />
        </header>
        <div className="cms-content">
          <Outlet context={{ user, institution, canWrite } satisfies CmsOutletContext} />
        </div>
      </div>
    </div>
  )
}

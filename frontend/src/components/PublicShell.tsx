import { useEffect, useId, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { Institution } from '../lib/api-client'
import { useT } from '../lib/i18n'
import { useReveal } from '../lib/use-reveal'
import { siteTemplate } from '../lib/site-template'
import { BrandLogo } from './brand/brand-logo'
import { BuiltByRaafat } from './brand/built-by-raafat'
import { LanguageSwitcher } from './LanguageSwitcher'

export function PublicShell({ institution }: { institution: Institution | null }) {
  const tNav = useT('navigation')
  const tHeader = useT('header')
  const tFooter = useT('footer')
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  useReveal(location.pathname)

  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  const shortName = institution?.shortName ?? siteTemplate.fallbackShortName
  const eyebrow = institution?.eyebrow ?? siteTemplate.fallbackEyebrow

  // Institutional primary nav — only working routes with appropriate content sources.
  // Culture & Heritage / Public Services await Phase 2 content architecture (no dead links).
  const nav = [
    { to: '/', label: tNav('home'), end: true },
    { to: '/about', label: tNav('about') },
    { to: '/stories', label: tNav('news') },
    { to: '/events', label: tNav('events') },
    { to: '/resources', label: tNav('resources') },
    { to: '/contact', label: tNav('contact') },
  ] as const

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <a href="#main-content" className="skip-link">
        {tHeader('skipToMain')}
      </a>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>{eyebrow}</span>
          <div className="utility-links">
            <Link to="/contact" className="utility-contact">
              {tNav('contact')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <BrandLogo />
            <span>
              <strong>{name}</strong>
              <small>{shortName}</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label={tNav('primary')}>
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="mobile-menu"
            aria-label={menuOpen ? tHeader('closeMenu') : tHeader('openMenu')}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="mobile-menu-icon" aria-hidden>
              {menuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>
        {menuOpen ? (
          <nav id={menuId} className="mobile-nav" aria-label={tNav('mobile')}>
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
                <span aria-hidden>→</span>
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>
      <Outlet />
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <strong>{name}</strong>
            <p className="footer-note">{tFooter('officialInformation', { name })}</p>
            <p className="footer-note">{tFooter('endorsedBy')}</p>
          </div>
          <div>
            <h3>{tFooter('getInTouch')}</h3>
            <p>{institution?.address}</p>
            <p>{institution?.phone}</p>
            <p>{institution?.email}</p>
          </div>
          <div>
            <h3>{tFooter('explore')}</h3>
            <Link to="/about">{tNav('about')}</Link>
            <Link to="/stories">{tNav('news')}</Link>
            <Link to="/events">{tNav('events')}</Link>
            <Link to="/resources">{tNav('resources')}</Link>
            <Link to="/contact">{tNav('contact')}</Link>
            <Link to="/privacy">{tFooter('privacy')}</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {shortName}
          </span>
          <BuiltByRaafat className="footer-credit" linkClassName="footer-credit-link" prefix={tFooter('builtBy')} />
        </div>
      </footer>
    </>
  )
}

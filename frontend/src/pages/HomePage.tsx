import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CoverMedia } from '../components/CoverMedia'
import { HeroMedia } from '../components/HeroMedia'
import {
  institutionApi,
  newsApi,
  type Institution,
  type NewsListItem,
} from '../lib/api-client'
import { formatPublicDate } from '../lib/format'
import { governmentOrgLd, setJsonLd } from '../lib/json-ld'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { usePageHead } from '../lib/use-page-head'

export function HomePage() {
  const { locale } = useI18n()
  const t = useT('home')
  const tCommon = useT('common')
  const tNav = useT('navigation')
  const tSeo = useT('seo')
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [stories, setStories] = useState<NewsListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setStories(null)
    setError(null)
    Promise.all([institutionApi.get(), newsApi.list()])
      .then(([inst, newsItems]) => {
        setInstitution(inst)
        setStories(newsItems.slice(0, 3))
      })
      .catch((err: Error) => {
        setStories([])
        setError(err.message)
      })
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setJsonLd('ld-gov-org', governmentOrgLd(institution))
    return () => setJsonLd('ld-gov-org', null)
  }, [institution])

  const loading = stories === null && !error
  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  usePageHead({
    title: tSeo('homeTitle', { name }),
    description: tSeo('homeDescription', { name }),
    path: '/',
    locale,
  })

  const quickLinks = [
    { to: '/about', label: tNav('about') },
    { to: '/stories', label: tNav('news') },
    { to: '/events', label: tNav('events') },
    { to: '/resources', label: tNav('resources') },
    { to: '/contact', label: tNav('contact') },
  ] as const

  return (
    <main id="main-content">
      <section className="hero hero-media-hero">
        <HeroMedia />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow light motion-enter">{name}</span>
            <h1 className="motion-enter motion-d2">{t('heroTitle')}</h1>
            <p className="motion-enter motion-d3">{t('heroSubtitle')}</p>
            <div className="hero-actions motion-enter motion-d4">
              <Link className="button button-light" to="/about">
                {t('ctaAbout')}
              </Link>
              <Link className="button button-ghost" to="/stories">
                {t('ctaNews')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="container section section-compact">
          <div className="directory-empty" role="alert">
            <h2>{t('loadError')}</h2>
            <p className="muted">{error}</p>
            <button type="button" className="button button-dark" onClick={load}>
              {t('tryAgain')}
            </button>
          </div>
        </section>
      ) : null}

      <section className="section section-compact">
        <div className="container">
          <span className="eyebrow">{t('essenceEyebrow')}</span>
          <h2 className="section-heading" style={{ display: 'block', marginBottom: 28 }}>
            {t('essenceTitle')}
          </h2>
          <div className="essence-grid">
            <div className="essence-item">
              <h3>{t('pillar1Title')}</h3>
              <p>{t('pillar1Text')}</p>
            </div>
            <div className="essence-item">
              <h3>{t('pillar2Title')}</h3>
              <p>{t('pillar2Text')}</p>
            </div>
            <div className="essence-item">
              <h3>{t('pillar3Title')}</h3>
              <p>{t('pillar3Text')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-compact tinted">
        <div className="container">
          <span className="eyebrow">{t('lookingFor')}</span>
          <div className="quick-chips">
            {quickLinks.map((item) => (
              <Link key={item.to} className="quick-chip" to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-compact">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('storiesEyebrow')}</span>
              <h2>{t('storiesTitle')}</h2>
            </div>
            <Link className="text-link" to="/stories">
              {t('seeAllStories')} →
            </Link>
          </div>
          {loading ? (
            <div className="directory-loading" aria-busy="true">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : null}
          {!loading && !error && (stories?.length ?? 0) === 0 ? (
            <p className="muted">{t('noStories')}</p>
          ) : null}
          {!loading && !error && stories && stories.length > 0 ? (
            <div className="home-card-grid">
              {stories.map((item) => (
                <Link key={item.id} to={`/stories/${item.slug}`} className="home-card">
                  <CoverMedia src={item.coverImage} alt="" ratio="thumb" />
                  <span className="category">{item.category ?? tCommon('information')}</span>
                  <h3>{item.title}</h3>
                  <p>
                    <time>{formatPublicDate(item.publishedAt ?? item.createdAt)}</time>
                    {item.summary ? ` · ${item.summary}` : null}
                  </p>
                  <span className="text-link">{tCommon('readMore')} →</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-inner">
          <span>{tNav('contact')}</span>
          <p>{institution?.address ?? tCommon('contactTheOffice')}</p>
          <Link to="/contact">{tCommon('getInTouch')} →</Link>
        </div>
      </section>
    </main>
  )
}

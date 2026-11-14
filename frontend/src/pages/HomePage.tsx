import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CoverMedia } from '../components/CoverMedia'
import { HeroMedia } from '../components/HeroMedia'
import { itineraries } from '../data/itineraries'
import {
  institutionApi,
  newsApi,
  servicesApi,
  type Institution,
  type NewsListItem,
  type ServiceItem,
} from '../lib/api-client'
import { isExperienceService, publicServicePath } from '../lib/content-kind'
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
  const tItin = useT('itineraries')
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [stories, setStories] = useState<NewsListItem[] | null>(null)
  const [services, setServices] = useState<ServiceItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setStories(null)
    setServices(null)
    setError(null)
    Promise.all([institutionApi.get(), newsApi.list(), servicesApi.list()])
      .then(([inst, newsItems, serviceItems]) => {
        setInstitution(inst)
        setStories(newsItems.slice(0, 3))
        setServices(serviceItems)
      })
      .catch((err: Error) => {
        setStories([])
        setServices([])
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

  const attractions = useMemo(
    () => (services ?? []).filter((s) => !isExperienceService(s)).slice(0, 6),
    [services],
  )
  const experiences = useMemo(
    () => (services ?? []).filter(isExperienceService).slice(0, 3),
    [services],
  )

  const loading = (stories === null || services === null) && !error
  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  usePageHead({
    title: tSeo('homeTitle', { name }),
    description: tSeo('homeDescription', { name }),
    path: '/',
    locale,
  })

  const chips = [
    { to: '/explore?q=gate', label: t('chipGates') },
    { to: '/experiences?q=coffee', label: t('chipCoffee') },
    { to: '/explore?q=shrine', label: t('chipShrines') },
    { to: '/plan', label: t('chipStay') },
    { to: '/experiences?q=hyena', label: t('chipNight') },
  ] as const

  function itinBadge(id: string) {
    if (id === '24h') return tItin('badge1Day')
    if (id === '3day') return tItin('badge3Days')
    return tItin('badgeFamily')
  }

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
              <Link className="button button-light" to="/map">
                {t('ctaMap')}
              </Link>
              <Link className="button button-ghost" to="/plan/itineraries">
                {t('ctaPlan')}
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
            {chips.map((chip) => (
              <Link key={chip.label} className="quick-chip" to={chip.to}>
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-compact">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{tNav('explore')}</span>
              <h2>{t('mustSee')}</h2>
              <p className="muted" style={{ margin: '10px 0 0', maxWidth: 520 }}>
                {t('mustSeeIntro')}
              </p>
            </div>
            <Link className="text-link" to="/explore">
              {t('viewAllAttractions')} →
            </Link>
          </div>
          {loading ? (
            <div className="directory-loading" aria-busy="true">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : null}
          {!loading && !error && attractions.length === 0 ? (
            <p className="muted">{t('noAttractions')}</p>
          ) : null}
          {!loading && !error && attractions.length > 0 ? (
            <div className="home-card-grid reveal">
              {attractions.map((item) => (
                <Link key={item.id} to={publicServicePath(item)} className="home-card">
                  <CoverMedia src={item.coverImage} alt="" ratio="thumb" />
                  {item.category ? <span className="category">{item.category}</span> : null}
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <span className="text-link">{tCommon('learnMore')} →</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section section-compact tinted">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{tNav('experiences')}</span>
              <h2>{t('curatedExperiences')}</h2>
              <p className="muted" style={{ margin: '10px 0 0', maxWidth: 520 }}>
                {t('experiencesIntro')}
              </p>
            </div>
            <Link className="text-link" to="/experiences">
              {t('viewAllExperiences')} →
            </Link>
          </div>
          {loading ? (
            <div className="directory-loading" aria-busy="true">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : null}
          {!loading && !error && experiences.length === 0 ? (
            <p className="muted">{t('noExperiences')}</p>
          ) : null}
          {!loading && !error && experiences.length > 0 ? (
            <div className="home-card-grid reveal reveal-d1">
              {experiences.map((item) => (
                <Link key={item.id} to={publicServicePath(item)} className="home-card">
                  <CoverMedia src={item.coverImage} alt="" ratio="thumb" />
                  {item.category ? <span className="category">{item.category}</span> : null}
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <span className="text-link">{tCommon('learnMore')} →</span>
                </Link>
              ))}
            </div>
          ) : null}
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

      <section className="section section-compact tinted">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('itinEyebrow')}</span>
              <h2>{t('itinTitle')}</h2>
              <p className="muted" style={{ margin: '10px 0 0', maxWidth: 520 }}>
                {t('itinIntro')}
              </p>
            </div>
            <Link className="text-link" to="/plan/itineraries">
              {t('itinCta')} →
            </Link>
          </div>
          <div className="itin-teaser-grid">
            {itineraries.map((itin) => (
              <Link key={itin.id} to="/plan/itineraries" className="home-card">
                <span className="category">{itinBadge(itin.id)}</span>
                <h3>{itin.title}</h3>
                <p>{itin.summary}</p>
                <span className="text-link">{t('itinOpen')} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="map-teaser">
        <div className="container">
          <span className="eyebrow light">{t('mapEyebrow')}</span>
          <h2>{t('mapTitle')}</h2>
          <p>{t('mapIntro')}</p>
          <Link className="button button-light" to="/map">
            {t('openMap')}
          </Link>
        </div>
      </section>

      <section className="section section-compact advice-banner">
        <div className="container">
          <span className="eyebrow">{t('adviceEyebrow')}</span>
          <h2 style={{ font: '500 28px/1.2 Georgia,serif', margin: '0 0 28px' }}>{t('adviceTitle')}</h2>
          <div className="advice-grid">
            <div>
              <h3>{t('adviceGetHere')}</h3>
              <p>{t('adviceGetHereText')}</p>
            </div>
            <div>
              <h3>{t('adviceDress')}</h3>
              <p>{t('adviceDressText')}</p>
            </div>
            <div>
              <h3>{t('adviceWalk')}</h3>
              <p>{t('adviceWalkText')}</p>
            </div>
          </div>
          <p style={{ marginTop: 28 }}>
            <Link className="button button-dark" to="/plan">
              {tNav('plan')}
            </Link>
          </p>
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

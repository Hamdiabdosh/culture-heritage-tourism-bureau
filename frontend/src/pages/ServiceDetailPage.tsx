import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CoverMedia } from '../components/CoverMedia'
import { DetailNotFound } from '../components/CatalogState'
import {
  ApiClientError,
  newsApi,
  servicesApi,
  type NewsListItem,
  type ServiceItem,
} from '../lib/api-client'
import { isExperienceService, publicServicePath } from '../lib/content-kind'
import { splitParagraphs } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

export function ServiceDetailPage() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const { locale } = useI18n()
  const tExplore = useT('explore')
  const tExp = useT('experiences')
  const tCommon = useT('common')
  const tHome = useT('home')
  const [item, setItem] = useState<ServiceItem | null>(null)
  const [allServices, setAllServices] = useState<ServiceItem[]>([])
  const [stories, setStories] = useState<NewsListItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const fromExperiences =
    location.pathname.startsWith('/experiences') ||
    (item ? isExperienceService(item) : false)
  const t = fromExperiences ? tExp : tExplore
  const tNotFound = useT('notFound')
  const listPath = fromExperiences ? '/experiences' : '/explore'
  const detailPath = `${listPath}/${slug}`

  const is404 = error === '404'
  usePageHead({
    title: formatDocumentTitle(is404 ? t('emptyTitle') : item?.title),
    description: item?.summary ?? undefined,
    path: detailPath,
    locale,
    noindex: is404,
  })

  useEffect(() => {
    let cancelled = false
    setItem(null)
    setError(null)
    Promise.all([
      servicesApi.bySlug(slug),
      servicesApi.list().catch(() => [] as ServiceItem[]),
      newsApi.list().catch(() => [] as NewsListItem[]),
    ])
      .then(([data, list, news]) => {
        if (cancelled) return
        setItem(data)
        setAllServices(list)
        setStories(news)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError && err.status === 404 ? '404' : err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const nearby = useMemo(() => {
    if (!item) return []
    const same = allServices.filter((s) => s.id !== item.id && s.category === item.category)
    const rest = allServices.filter((s) => s.id !== item.id && s.category !== item.category)
    return [...same, ...rest].slice(0, 3)
  }, [allServices, item])

  const relatedStories = useMemo(() => stories.slice(0, 2), [stories])

  if (error) {
    return (
      <DetailNotFound
        title={error === '404' ? tNotFound('title') : error}
        body={error === '404' ? tNotFound('body') : undefined}
        backTo={listPath}
        backLabel={t('backToList')}
        homeLabel={tNotFound('returnHome')}
      />
    )
  }

  if (!item) {
    return (
      <main className="inner-page container page-intro">
        <div className="directory-loading" aria-busy="true">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="service-detail">
      <CoverMedia src={item.coverImage} alt="" ratio="hero" className="detail-cover motion-enter" />
      <div className="container">
        <Link className="back-link" to={listPath}>
          {t('backToList')}
        </Link>
        <span className="eyebrow motion-enter motion-d1">{item.category ?? tCommon('information')}</span>
        <h1 className="motion-enter motion-d2">{item.title}</h1>
        {item.summary ? <p className="detail-lead motion-enter motion-d3">{item.summary}</p> : null}
        <div className="detail-grid">
          <div>
            <h2>{t('aboutItem')}</h2>
            {splitParagraphs(item.description).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            {item.process.length > 0 ? (
              <>
                <h2>{t('howItWorks')}</h2>
                <ul>
                  {item.process.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {item.requiredDocuments.length > 0 ? (
              <>
                <h2>{t('whatToBring')}</h2>
                <ul>
                  {item.requiredDocuments.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <aside className="side-card visitor-info">
            <span className="eyebrow">{t('visitorInfo')}</span>
            <h3>{item.responsibleOffice ?? t('hostLabel')}</h3>
            <dl>
              {item.eligibility ? (
                <>
                  <dt>{t('visitorNotes')}</dt>
                  <dd>{item.eligibility}</dd>
                </>
              ) : null}
              <dt>{tCommon('contact')}</dt>
              <dd>{item.contact ?? '—'}</dd>
            </dl>
            <p className="muted" style={{ marginTop: 16 }}>
              {t('helpText')}
            </p>
            <Link className="button button-dark" to="/contact" style={{ marginTop: 12 }}>
              {tCommon('getInTouch')}
            </Link>
          </aside>
        </div>

        {nearby.length > 0 ? (
          <section className="connected-strip">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t('nearbyEyebrow')}</span>
                <h2>{t('nearbyTitle')}</h2>
              </div>
            </div>
            <div className="home-card-grid">
              {nearby.map((near) => (
                <Link key={near.id} to={publicServicePath(near)} className="home-card">
                  <CoverMedia src={near.coverImage} alt="" ratio="thumb" />
                  {near.category ? <span className="category">{near.category}</span> : null}
                  <h3>{near.title}</h3>
                  <p>{near.summary}</p>
                  <span className="text-link">{tCommon('learnMore')} →</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedStories.length > 0 ? (
          <section className="connected-strip">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{tHome('storiesEyebrow')}</span>
                <h2>{t('relatedStories')}</h2>
              </div>
              <Link className="text-link" to="/stories">
                {tHome('seeAllStories')} →
              </Link>
            </div>
            <div className="home-card-grid">
              {relatedStories.map((story) => (
                <Link key={story.id} to={`/stories/${story.slug}`} className="home-card">
                  <CoverMedia src={story.coverImage} alt="" ratio="thumb" />
                  <span className="category">{story.category ?? tCommon('information')}</span>
                  <h3>{story.title}</h3>
                  <p>{story.summary}</p>
                  <span className="text-link">{tCommon('readMore')} →</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

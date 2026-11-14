import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetailNotFound } from '../components/CatalogState'
import { ApiClientError, eventsApi, type EventItem } from '../lib/api-client'
import { formatEventDateParts, splitParagraphs } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

export function EventDetailPage() {
  const { slug = '' } = useParams()
  const { locale } = useI18n()
  const t = useT('events')
  const tCommon = useT('common')
  const tNav = useT('navigation')
  const tNotFound = useT('notFound')
  const [item, setItem] = useState<EventItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const is404 = error === '404'
  usePageHead({
    title: formatDocumentTitle(is404 ? t('emptyTitle') : item?.title),
    description: item?.summary ?? undefined,
    path: `/events/${slug}`,
    locale,
    noindex: is404,
  })

  useEffect(() => {
    let cancelled = false
    setItem(null)
    setError(null)
    eventsApi
      .bySlug(slug)
      .then((data) => {
        if (!cancelled) setItem(data)
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

  if (error) {
    return (
      <DetailNotFound
        title={error === '404' ? tNotFound('title') : error}
        body={error === '404' ? tNotFound('body') : undefined}
        backTo="/events"
        backLabel={t('backToEvents')}
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

  const parts = formatEventDateParts(item.eventDate)

  return (
    <main id="main-content" className="service-detail">
      <div className="container">
        <Link className="back-link" to="/events">
          {t('backToEvents')}
        </Link>
        <span className="eyebrow motion-enter">{item.type ?? t('eyebrow')}</span>
        <h1 className="motion-enter motion-d2">{item.title}</h1>
        {item.summary ? <p className="detail-lead motion-enter motion-d3">{item.summary}</p> : null}

        <div className="detail-grid">
          <div>
            <div className="article-content">
              {splitParagraphs(item.content).length === 0 ? (
                <p className="muted">{tCommon('noPageContent')}</p>
              ) : (
                splitParagraphs(item.content).map((para) => <p key={para.slice(0, 24)}>{para}</p>)
              )}
            </div>
            <section className="story-next">
              <h2>{t('whileHere')}</h2>
              <p className="muted">{t('whileHereIntro')}</p>
              <div className="hero-actions">
                <Link className="button button-dark" to="/explore">
                  {tNav('explore')}
                </Link>
                <Link className="button button-outline" to="/experiences">
                  {tNav('experiences')}
                </Link>
              </div>
            </section>
          </div>
          <aside className="side-card visitor-info">
            <span className="eyebrow">{t('visitorInfo')}</span>
            <h3>{t('whenWhere')}</h3>
            <dl>
              <dt>{t('dateLabel')}</dt>
              <dd>
                {parts.day} {parts.month} {parts.year}
              </dd>
              <dt>{t('locationLabel')}</dt>
              <dd>{item.location ?? t('locationTbc')}</dd>
            </dl>
            <Link className="button button-dark" to="/contact" style={{ marginTop: 16 }}>
              {tCommon('getInTouch')}
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}

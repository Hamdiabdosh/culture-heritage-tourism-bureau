import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogState } from '../components/CatalogState'
import { eventsApi, institutionApi, type EventItem, type Institution } from '../lib/api-client'
import { formatEventDateParts } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

export function EventsListPage() {
  const { locale } = useI18n()
  const [searchParams] = useSearchParams()
  const t = useT('events')
  const tCommon = useT('common')
  const [items, setItems] = useState<EventItem[] | null>(null)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setQuery(q)
  }, [searchParams])

  function load() {
    setItems(null)
    setError(null)
    Promise.all([eventsApi.list(), institutionApi.get().catch(() => null)])
      .then(([list, inst]) => {
        setItems(list)
        setInstitution(inst)
      })
      .catch((err: Error) => {
        setItems([])
        setError(err.message)
      })
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items ?? []
    return (items ?? []).filter((item) =>
      `${item.title} ${item.summary ?? ''} ${item.location ?? ''} ${item.type ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [items, query])

  const loading = items === null && !error
  const emptyCatalog = items !== null && items.length === 0 && !error
  const noMatch = items !== null && items.length > 0 && filtered.length === 0
  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  usePageHead({
    title: formatDocumentTitle(t('title'), name),
    description: t('intro', { name }),
    path: '/events',
    locale,
  })

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{t('title')}</h1>
        <p>{t('intro', { name })}</p>
      </div>

      <section className="container directory">
        <label className="search-box">
          <span aria-hidden>⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            autoComplete="off"
          />
        </label>

        <div className="results-head" style={{ marginTop: 28 }}>
          <span>{t('resultsCount', { count: filtered.length })}</span>
          <span>{t('publishedLabel')}</span>
        </div>

        <CatalogState
          loading={loading}
          error={error}
          empty={emptyCatalog}
          noMatch={noMatch}
          emptyTitle={t('emptyTitle')}
          emptyBody={t('empty')}
          loadErrorTitle={t('loadError')}
          tryAgainLabel={t('tryAgain')}
          noMatchLabel={t('noMatch')}
          onRetry={load}
          emptyCtaTo="/contact"
          emptyCtaLabel={tCommon('getInTouch')}
        />

        {!loading && !error && !emptyCatalog ? (
          <div className="event-list catalog-settle">
            {filtered.map((item) => {
              const parts = formatEventDateParts(item.eventDate)
              return (
                <Link key={item.id} to={`/events/${item.slug}`} className="event-card">
                  <div className="event-date">
                    <strong>{parts.day}</strong>
                    <span>
                      {parts.month}
                      <br />
                      {parts.year}
                    </span>
                  </div>
                  <div>
                    <span className="category">{item.type ?? t('eyebrow')}</span>
                    <h3>{item.title}</h3>
                    <p>{item.location ?? item.summary ?? t('locationTbc')}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : null}

        {emptyCatalog ? (
          <p style={{ marginTop: 16 }}>
            <Link className="text-link" to="/plan">
              {t('emptyPlanLink')} →
            </Link>
          </p>
        ) : null}
      </section>
    </main>
  )
}

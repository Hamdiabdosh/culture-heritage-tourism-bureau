import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogState } from '../components/CatalogState'
import { CoverMedia } from '../components/CoverMedia'
import { institutionApi, newsApi, type Institution, type NewsListItem } from '../lib/api-client'
import { formatPublicDate } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

const ALL = '__all__'

export function NewsListPage() {
  const { locale } = useI18n()
  const [searchParams] = useSearchParams()
  const t = useT('news')
  const tCommon = useT('common')
  const tNotFound = useT('notFound')
  const [items, setItems] = useState<NewsListItem[] | null>(null)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [topic, setTopic] = useState(ALL)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setQuery(q)
  }, [searchParams])

  function load() {
    setItems(null)
    setError(null)
    Promise.all([newsApi.list(), institutionApi.get().catch(() => null)])
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

  const topics = useMemo(() => {
    const set = new Set<string>()
    for (const item of items ?? []) {
      const c = item.category?.trim()
      if (c) set.add(c)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter((item) => {
      if (topic !== ALL && (item.category ?? '') !== topic) return false
      if (!q) return true
      return `${item.title} ${item.summary ?? ''} ${item.category ?? ''}`.toLowerCase().includes(q)
    })
  }, [items, query, topic])

  const loading = items === null && !error
  const emptyCatalog = items !== null && items.length === 0 && !error
  const noMatch = items !== null && items.length > 0 && filtered.length === 0
  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  usePageHead({
    title: formatDocumentTitle(t('title'), name),
    description: t('intro', { name }),
    path: '/stories',
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

        <div className="directory-layout">
          <aside aria-label={t('allUpdates')}>
            <span className="eyebrow">{t('allUpdates')}</span>
            <button
              type="button"
              className={topic === ALL ? 'filter-active' : undefined}
              onClick={() => setTopic(ALL)}
            >
              {t('allUpdates')} <span>{items?.length ?? 0}</span>
            </button>
            {topics.map((name) => (
              <button
                key={name}
                type="button"
                className={topic === name ? 'filter-active' : undefined}
                onClick={() => setTopic(name)}
              >
                {name}{' '}
                <span>{(items ?? []).filter((i) => i.category === name).length}</span>
              </button>
            ))}
          </aside>

          <div className="directory-results">
            <div className="results-head">
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
              emptyCtaTo="/explore"
              emptyCtaLabel={tNotFound('browseExplore')}
            />

            {!loading && !error && !emptyCatalog ? (
              <div className="news-listing catalog-settle">
                {filtered.map((item) => (
                  <Link key={item.id} to={`/stories/${item.slug}`} className="news-card news-card-media">
                    <CoverMedia src={item.coverImage} alt="" ratio="thumb" />
                    <div className="news-meta">
                      <span className="category">{item.category ?? tCommon('information')}</span>
                      <time>{formatPublicDate(item.publishedAt ?? item.createdAt)}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    <span className="text-link">{tCommon('readMore')}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogState } from '../components/CatalogState'
import {
  documentsApi,
  institutionApi,
  type DocumentItem,
  type Institution,
} from '../lib/api-client'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

const ALL = '__all__'

export function ResourcesListPage() {
  const { locale } = useI18n()
  const [searchParams] = useSearchParams()
  const t = useT('resources')
  const tCommon = useT('common')
  const [items, setItems] = useState<DocumentItem[] | null>(null)
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
    Promise.all([documentsApi.list(), institutionApi.get().catch(() => null)])
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
    let cancelled = false
    Promise.all([documentsApi.list(), institutionApi.get().catch(() => null)])
      .then(([list, inst]) => {
        if (cancelled) return
        setItems(list)
        setInstitution(inst)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setItems([])
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
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
      return `${item.title} ${item.summary ?? ''} ${item.category ?? ''} ${item.year ?? ''}`
        .toLowerCase()
        .includes(q)
    })
  }, [items, query, topic])

  const loading = items === null && !error
  const emptyCatalog = items !== null && items.length === 0 && !error
  const noMatch = items !== null && items.length > 0 && filtered.length === 0
  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  usePageHead({
    title: formatDocumentTitle(t('title'), name),
    description: t('intro', { name }),
    path: '/resources',
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
          <aside aria-label={t('filterByType')}>
            <span className="eyebrow">{t('filterByType')}</span>
            <button
              type="button"
              className={topic === ALL ? 'filter-active' : undefined}
              onClick={() => setTopic(ALL)}
            >
              {t('allDocuments')} <span>{items?.length ?? 0}</span>
            </button>
            {topics.map((cat) => (
              <button
                key={cat}
                type="button"
                className={topic === cat ? 'filter-active' : undefined}
                onClick={() => setTopic(cat)}
              >
                {cat} <span>{(items ?? []).filter((i) => i.category === cat).length}</span>
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
              emptyCtaTo="/plan"
              emptyCtaLabel={tCommon('learnMore')}
              skeletonCount={2}
            />

            {!loading && !error && !emptyCatalog ? (
              <div className="resource-list catalog-settle">
                {filtered.map((item) => (
                  <Link key={item.id} to={`/resources/${item.slug}`} className="resource">
                    <span className="resource-icon" aria-hidden>
                      ▣
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.category ?? tCommon('file')}
                        {item.year ? ` · ${item.year}` : ''}
                        {item.fileType ? ` · ${item.fileType}` : ''}
                      </small>
                      {item.summary ? (
                        <span className="resource-summary">{item.summary}</span>
                      ) : null}
                    </span>
                    <span aria-hidden>→</span>
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

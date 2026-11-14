import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogState } from '../components/CatalogState'
import { CoverMedia } from '../components/CoverMedia'
import { institutionApi, servicesApi, type Institution, type ServiceItem } from '../lib/api-client'
import { isExperienceService, publicServicePath } from '../lib/content-kind'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

const ALL = '__all__'

export type ServicesMode = 'all' | 'attractions' | 'experiences'

export function ServicesListPage({ mode = 'attractions' }: { mode?: ServicesMode }) {
  const { locale } = useI18n()
  const [searchParams] = useSearchParams()
  const tExplore = useT('explore')
  const tExp = useT('experiences')
  const t = mode === 'experiences' ? tExp : tExplore
  const tCommon = useT('common')
  const [items, setItems] = useState<ServiceItem[] | null>(null)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [topic, setTopic] = useState(ALL)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setQuery(q)
  }, [searchParams])

  const listPath = mode === 'experiences' ? '/experiences' : '/explore'

  function load() {
    setItems(null)
    setError(null)
    Promise.all([servicesApi.list(), institutionApi.get().catch(() => null)])
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

  const catalog = useMemo(() => {
    const list = items ?? []
    if (mode === 'experiences') return list.filter(isExperienceService)
    if (mode === 'attractions') return list.filter((i) => !isExperienceService(i))
    return list
  }, [items, mode])

  const topics = useMemo(() => {
    const set = new Set<string>()
    for (const item of catalog) {
      const c = item.category?.trim()
      if (c) set.add(c)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [catalog])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((item) => {
      if (topic !== ALL && (item.category ?? '') !== topic) return false
      if (!q) return true
      const hay = `${item.title} ${item.summary ?? ''} ${item.category ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [catalog, query, topic])

  const loading = items === null && !error
  const emptyCatalog = items !== null && catalog.length === 0 && !error
  const noMatch = catalog.length > 0 && filtered.length === 0
  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  usePageHead({
    title: formatDocumentTitle(t('directoryTitle'), name),
    description: t('directoryIntro', { name }),
    path: listPath,
    locale,
  })

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{t('directoryTitle')}</h1>
        <p>{t('directoryIntro', { name })}</p>
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
          <aside aria-label={t('filterByTopic')}>
            <span className="eyebrow">{t('filterByTopic')}</span>
            <button
              type="button"
              className={topic === ALL ? 'filter-active' : undefined}
              onClick={() => setTopic(ALL)}
            >
              {t('allItems')} <span>{catalog.length}</span>
            </button>
            {topics.map((topicName) => {
              const count = catalog.filter((i) => i.category === topicName).length
              return (
                <button
                  key={topicName}
                  type="button"
                  className={topic === topicName ? 'filter-active' : undefined}
                  onClick={() => setTopic(topicName)}
                >
                  {topicName} <span>{count}</span>
                </button>
              )
            })}
          </aside>

          <div className="directory-results">
            <div className="results-head">
              <span>{t('itemsCount', { count: filtered.length })}</span>
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
              <div className="catalog-settle">
                {filtered.map((item) => (
                  <Link key={item.id} to={publicServicePath(item)} className="directory-card directory-card-media">
                    <CoverMedia src={item.coverImage} alt="" ratio="thumb" />
                    <div>
                      <h2>{item.title}</h2>
                      <p>{item.summary}</p>
                      {item.category ? <span className="category">{item.category}</span> : null}
                      <span className="text-link">{t('viewItem')} →</span>
                    </div>
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

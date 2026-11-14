import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DetailNotFound } from '../components/CatalogState'
import { ApiClientError, institutionApi, pagesApi, type PublicPage } from '../lib/api-client'
import { splitParagraphs } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

const RESERVED = new Set([
  'about',
  'api',
  'cms',
  'contact',
  'events',
  'explore',
  'experiences',
  'login',
  'map',
  'news',
  'plan',
  'privacy',
  'resources',
  'services',
  'stories',
])

export function CmsPageDetailPage({ forcedSlug }: { forcedSlug?: string } = {}) {
  const { slug: paramSlug = '' } = useParams()
  const slug = forcedSlug ?? paramSlug
  const { locale } = useI18n()
  const t = useT('pages')
  const tCommon = useT('common')
  const tNotFound = useT('notFound')
  const [page, setPage] = useState<PublicPage | null | undefined>(undefined)
  const [officeName, setOfficeName] = useState<string>(siteTemplate.fallbackInstitutionName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    institutionApi
      .get()
      .then((inst) => setOfficeName(inst.name))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!slug || (!forcedSlug && RESERVED.has(slug))) {
      setPage(null)
      setError('404')
      return
    }
    let cancelled = false
    setPage(undefined)
    setError(null)
    pagesApi
      .bySlug(slug, locale)
      .then((data) => {
        if (!cancelled) setPage(data)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setPage(null)
          setError(err instanceof ApiClientError && err.status === 404 ? '404' : err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [slug, locale, forcedSlug])

  const is404 = error === '404'
  const publicPath =
    forcedSlug === 'plan'
      ? '/plan'
      : forcedSlug === 'plan-itineraries'
        ? '/plan/itineraries'
        : slug
          ? `/${slug}`
          : '/'
  usePageHead({
    title: formatDocumentTitle(
      is404 ? tNotFound('title') : error ? t('loadError') : page?.title,
      officeName,
    ),
    path: publicPath,
    locale,
    noindex: is404,
  })

  if (error) {
    return (
      <DetailNotFound
        title={error === '404' ? tNotFound('title') : t('loadError')}
        body={error === '404' ? tNotFound('body') : error}
        backTo="/explore"
        backLabel={tNotFound('browseExplore')}
        homeLabel={tNotFound('returnHome')}
      />
    )
  }

  if (page === undefined) {
    return (
      <main id="main-content" className="inner-page container page-intro">
        <div className="directory-loading" aria-busy="true">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </main>
    )
  }

  const paragraphs = splitParagraphs(page?.content ?? '')

  return (
    <main id="main-content" className="inner-page">
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{page?.title}</h1>
      </div>
      <section className="container article">
        <div className="article-content">
          {paragraphs.length === 0 ? (
            <p className="muted">{tCommon('noPageContent')}</p>
          ) : (
            paragraphs.map((para) => <p key={para.slice(0, 24)}>{para}</p>)
          )}
        </div>
      </section>
    </main>
  )
}

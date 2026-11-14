import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CoverMedia } from '../components/CoverMedia'
import { DetailNotFound } from '../components/CatalogState'
import { ApiClientError, institutionApi, newsApi, type NewsDetail } from '../lib/api-client'
import { formatPublicDate, splitParagraphs } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

export function NewsDetailPage() {
  const { slug = '' } = useParams()
  const { locale } = useI18n()
  const t = useT('news')
  const tCommon = useT('common')
  const tNav = useT('navigation')
  const tNotFound = useT('notFound')
  const [item, setItem] = useState<NewsDetail | null>(null)
  const [officeName, setOfficeName] = useState<string>(siteTemplate.fallbackInstitutionName)
  const [error, setError] = useState<string | null>(null)
  const is404 = error === '404'
  usePageHead({
    title: formatDocumentTitle(is404 ? t('emptyTitle') : item?.title, officeName),
    description: item?.summary ?? undefined,
    path: `/stories/${slug}`,
    locale,
    noindex: is404,
  })

  useEffect(() => {
    let cancelled = false
    setItem(null)
    setError(null)
    institutionApi
      .get()
      .then((inst) => {
        if (!cancelled) setOfficeName(inst.name)
      })
      .catch(() => undefined)
    newsApi
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
        backTo="/stories"
        backLabel={t('backToNews')}
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
    <main id="main-content" className="article-page">
      <CoverMedia src={item.coverImage} alt="" ratio="hero" className="detail-cover motion-enter" />
      <div className="container article">
        <Link className="back-link" to="/stories">
          {t('backToNews')}
        </Link>
        <span className="eyebrow motion-enter motion-d1">{item.category ?? tCommon('information')}</span>
        <h1 className="motion-enter motion-d2">{item.title}</h1>
        {item.summary ? <p className="article-lead motion-enter motion-d3">{item.summary}</p> : null}
        <div className="article-byline">
          <time>{formatPublicDate(item.publishedAt ?? item.createdAt)}</time>
          <span>· {t('publishedBy', { name: officeName })}</span>
        </div>
        <div className="article-rule" />
        <div className="article-content">
          {splitParagraphs(item.content).length === 0 ? (
            <p className="muted">{tCommon('noPageContent')}</p>
          ) : (
            splitParagraphs(item.content).map((para) => <p key={para.slice(0, 24)}>{para}</p>)
          )}
        </div>
        <section className="story-next">
          <h2>{t('exploreRelated')}</h2>
          <p className="muted">{t('exploreRelatedIntro')}</p>
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
    </main>
  )
}

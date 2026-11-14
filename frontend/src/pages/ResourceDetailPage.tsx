import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetailNotFound } from '../components/CatalogState'
import {
  ApiClientError,
  documentsApi,
  institutionApi,
  type DocumentItem,
} from '../lib/api-client'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

export function ResourceDetailPage() {
  const { slug = '' } = useParams()
  const { locale } = useI18n()
  const t = useT('resources')
  const tCommon = useT('common')
  const tNotFound = useT('notFound')
  const [item, setItem] = useState<DocumentItem | null>(null)
  const [shortName, setShortName] = useState(siteTemplate.fallbackInstitutionName)
  const [error, setError] = useState<string | null>(null)
  const is404 = error === '404'
  usePageHead({
    title: formatDocumentTitle(is404 ? t('emptyTitle') : item?.title),
    description: item?.summary ?? undefined,
    path: `/resources/${slug}`,
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
        if (!cancelled) setShortName(inst.shortName || siteTemplate.fallbackInstitutionName)
      })
      .catch(() => undefined)
    documentsApi
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
        backTo="/resources"
        backLabel={t('backToResources')}
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

  const meta = [item.year, item.fileType, item.fileSize].filter(Boolean).join(' · ')
  const fileType = item.fileType ?? tCommon('file')

  return (
    <main id="main-content" className="inner-page">
      <div className="container page-intro">
        <Link className="back-link" to="/resources">
          {t('backToResources')}
        </Link>
        <span className="eyebrow">{item.category ?? t('documentDownload')}</span>
        <h1>{item.title}</h1>
        {item.summary ? <p>{item.summary}</p> : null}
        {meta ? <p className="muted">{meta}</p> : null}

        <div className="resource-download">
          <div>
            <strong>{t('documentDownload')}</strong>
            <p>
              {item.fileUrl
                ? t('openOrDownload', { fileType, shortName: shortName || siteTemplate.fallbackInstitutionName })
                : t('noDownloadLink')}
            </p>
          </div>
          {item.fileUrl ? (
            <a
              className="button button-dark"
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('downloadWithType', { type: fileType })}
            </a>
          ) : (
            <span className="button button-outline" aria-disabled="true">
              {t('downloadUnavailable')}
            </span>
          )}
        </div>
      </div>
    </main>
  )
}

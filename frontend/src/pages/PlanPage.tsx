import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DetailNotFound } from '../components/CatalogState'
import { ApiClientError, institutionApi, pagesApi } from '../lib/api-client'
import { parsePlanContent, type PlanContent } from '../lib/plan-content'
import { splitParagraphs } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

/** /plan — structured CMS sections + fixed travel-hub companions. */
export function PlanPage() {
  const { locale } = useI18n()
  const t = useT('plan')
  const tPages = useT('pages')
  const tNav = useT('navigation')
  const tCommon = useT('common')
  const tNotFound = useT('notFound')
  const [plan, setPlan] = useState<PlanContent | null | undefined>(undefined)
  const [officeName, setOfficeName] = useState(siteTemplate.fallbackInstitutionName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    institutionApi
      .get()
      .then((inst) => setOfficeName(inst.name))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    setPlan(undefined)
    setError(null)
    pagesApi
      .bySlug('plan', locale)
      .then((data) => {
        if (!cancelled) setPlan(parsePlanContent(data.content))
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setPlan(null)
          setError(err instanceof ApiClientError && err.status === 404 ? '404' : err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const is404 = error === '404'
  usePageHead({
    title: formatDocumentTitle(
      is404 ? tNotFound('title') : error ? tPages('loadError') : plan?.title ?? t('title'),
      officeName,
    ),
    path: '/plan',
    locale,
    noindex: is404,
  })

  if (error) {
    return (
      <DetailNotFound
        title={error === '404' ? tNotFound('title') : tPages('loadError')}
        body={error === '404' ? tNotFound('body') : error}
        backTo="/explore"
        backLabel={tNotFound('browseExplore')}
        homeLabel={tNotFound('returnHome')}
      />
    )
  }

  if (plan === undefined) {
    return (
      <main id="main-content" className="inner-page container page-intro">
        <div className="directory-loading" aria-busy="true">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </main>
    )
  }

  const sections = (plan?.sections ?? []).filter((s) => s.body.trim() || s.image.trim())

  return (
    <main id="main-content" className="inner-page">
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{plan?.title ?? t('title')}</h1>
        <p className="muted" style={{ maxWidth: 540 }}>
          {t('hubIntro')}
        </p>
      </div>

      <section className="container plan-hub-strip">
        <div className="plan-hub-card">
          <span className="eyebrow">{t('itinEyebrow')}</span>
          <h2>{t('itinTitle')}</h2>
          <p>{t('itinBody')}</p>
          <Link className="button button-dark" to="/plan/itineraries">
            {t('itinCta')}
          </Link>
        </div>
        <div className="plan-hub-links">
          <span className="eyebrow">{t('quickLinks')}</span>
          <Link to="/explore">{tNav('explore')}</Link>
          <Link to="/experiences">{tNav('experiences')}</Link>
          <Link to="/events">{tNav('events')}</Link>
          <Link to="/contact">{tNav('contact')}</Link>
        </div>
      </section>

      <section className="container article">
        <div className="article-content">
          {sections.length === 0 ? (
            <p className="muted">{tCommon('noPageContent')}</p>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="plan-section">
                <h2>{section.title}</h2>
                {section.image ? (
                  <img className="plan-section-image" src={section.image} alt="" />
                ) : null}
                {splitParagraphs(section.body).map((para) => (
                  <p key={para.slice(0, 40)}>{para}</p>
                ))}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

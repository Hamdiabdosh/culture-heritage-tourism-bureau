import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DetailNotFound } from '../components/CatalogState'
import { itineraries } from '../data/itineraries'
import { ApiClientError, institutionApi, pagesApi, type PublicPage } from '../lib/api-client'
import { splitParagraphs } from '../lib/format'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

/**
 * /plan/itineraries — CMS page `plan-itineraries` supplies title + intro body;
 * day plans remain structured in code (frontend/src/data/itineraries.ts).
 */
export function PlanItinerariesPage() {
  const { locale } = useI18n()
  const t = useT('itineraries')
  const tNav = useT('navigation')
  const tPages = useT('pages')
  const tNotFound = useT('notFound')
  const [page, setPage] = useState<PublicPage | null | undefined>(undefined)
  const [officeName, setOfficeName] = useState(siteTemplate.fallbackInstitutionName)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState(itineraries[0]?.id ?? '24h')
  const active = itineraries.find((i) => i.id === activeId) ?? itineraries[0]

  useEffect(() => {
    institutionApi
      .get()
      .then((inst) => setOfficeName(inst.name))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    setPage(undefined)
    setError(null)
    pagesApi
      .bySlug('plan-itineraries', locale)
      .then((data) => {
        if (!cancelled) setPage(data)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          // Soft-fallback: page optional; still show static itineraries.
          if (err instanceof ApiClientError && err.status === 404) {
            setPage(null)
            setError(null)
          } else {
            setPage(null)
            setError(err.message)
          }
        }
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const title = page?.title ?? t('title')
  const introParas =
    page?.content && page.content.trim()
      ? splitParagraphs(page.content)
      : [t('intro')]

  usePageHead({
    title: formatDocumentTitle(title, officeName),
    description: introParas[0] ?? t('intro'),
    path: '/plan/itineraries',
    locale,
  })

  if (error) {
    return (
      <DetailNotFound
        title={tPages('loadError')}
        body={error}
        backTo="/plan"
        backLabel={t('backToPlan')}
        homeLabel={tNotFound('returnHome')}
      />
    )
  }

  if (page === undefined || !active) {
    return (
      <main id="main-content" className="inner-page container page-intro">
        <div className="directory-loading" aria-busy="true">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="inner-page">
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{title}</h1>
        {introParas.map((para) => (
          <p key={para.slice(0, 32)}>{para}</p>
        ))}
        <p>
          <Link className="text-link" to="/plan">
            {t('backToPlan')} →
          </Link>
        </p>
      </div>

      <section className="container itinerary-page">
        <div className="itinerary-tabs" role="tablist" aria-label={title}>
          {itineraries.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active.id}
              className={item.id === active.id ? 'is-active' : undefined}
              onClick={() => setActiveId(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>

        <div className="itinerary-panel" role="tabpanel">
          <h2>{active.title}</h2>
          <p className="muted">{active.summary}</p>

          {active.days.map((day) => (
            <div key={day.label} className="itinerary-day">
              {active.days.length > 1 ? <h3>{day.label}</h3> : null}
              {day.blocks.map((block) => (
                <div key={`${day.label}-${block.period}`} className="itinerary-block">
                  <span className="eyebrow">{block.period}</span>
                  <ul className="itinerary-stops">
                    {block.stops.map((stop) => (
                      <li key={`${stop.time}-${stop.title}`}>
                        <time>{stop.time}</time>
                        <div>
                          {stop.href ? (
                            <Link to={stop.href}>
                              <strong>{stop.title}</strong>
                            </Link>
                          ) : (
                            <strong>{stop.title}</strong>
                          )}
                          <p>{stop.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}

          <div className="hero-actions" style={{ marginTop: 28 }}>
            <Link className="button button-dark" to="/explore">
              {tNav('explore')}
            </Link>
            <Link className="button button-outline" to="/plan">
              {tNav('plan')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { institutionApi, type Institution } from '../lib/api-client'
import { governmentOrgLd, setJsonLd } from '../lib/json-ld'
import { useI18n, useT } from '../lib/i18n'
import { mapsLinks, telHref } from '../lib/maps'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

export function ContactPage() {
  const { locale } = useI18n()
  const t = useT('contact')
  const tCommon = useT('common')
  const [institution, setInstitution] = useState<Institution | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setInstitution(undefined)
    setError(null)
    institutionApi
      .get()
      .then(setInstitution)
      .catch((err: Error) => {
        setInstitution(null)
        setError(err.message)
      })
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setJsonLd('ld-gov-org', governmentOrgLd(institution ?? null))
    return () => setJsonLd('ld-gov-org', null)
  }, [institution])

  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  const loading = institution === undefined && !error
  const maps = mapsLinks(institution?.address)

  usePageHead({
    title: formatDocumentTitle(t('title'), name),
    description: t('intro', { name }),
    path: '/contact',
    locale,
  })

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{t('title')}</h1>
        <p>{t('intro', { name })}</p>
      </div>

      <section className="container contact-section">
        {loading ? (
          <div className="directory-loading" aria-busy="true">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : null}

        {error ? (
          <div className="directory-empty" role="alert">
            <h2>{t('loadError')}</h2>
            <p className="muted">{error}</p>
            <button type="button" className="button button-dark" onClick={load}>
              {t('tryAgain')}
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="about-layout">
            <div className="about-main">
              <h2>{t('deskTitle')}</h2>
              <p>{t('deskBody')}</p>
              <div className="contact-actions">
                {institution?.phone ? (
                  <a className="button button-dark" href={telHref(institution.phone)}>
                    {t('call')}
                  </a>
                ) : null}
                {institution?.email ? (
                  <a className="button button-outline" href={`mailto:${institution.email}`}>
                    {t('emailAction')}
                  </a>
                ) : null}
                {maps ? (
                  <>
                    <a
                      className="button button-outline"
                      href={maps.google}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('openInGoogleMaps')}
                    </a>
                    <a
                      className="button button-outline"
                      href={maps.apple}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('openInAppleMaps')}
                    </a>
                  </>
                ) : null}
                <Link className="button button-outline" to="/explore">
                  {tCommon('learnMore')}
                </Link>
              </div>
            </div>
            <aside className="side-card">
              <span className="eyebrow">{t('details')}</span>
              <h3>{institution?.shortName ?? name}</h3>
              <dl>
                <dt>{t('address')}</dt>
                <dd>
                  {institution?.address ? (
                    maps ? (
                      <a href={maps.google} target="_blank" rel="noopener noreferrer">
                        {institution.address}
                      </a>
                    ) : (
                      institution.address
                    )
                  ) : (
                    '—'
                  )}
                </dd>
                <dt>{t('phone')}</dt>
                <dd>
                  {institution?.phone ? (
                    <a href={telHref(institution.phone)}>{institution.phone}</a>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt>{t('email')}</dt>
                <dd>
                  {institution?.email ? (
                    <a href={`mailto:${institution.email}`}>{institution.email}</a>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt>{t('hours')}</dt>
                <dd>{institution?.hours ?? '—'}</dd>
              </dl>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  )
}

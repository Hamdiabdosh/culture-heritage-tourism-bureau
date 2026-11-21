import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { institutionApi, type Institution } from '../lib/api-client'
import { useI18n, useT } from '../lib/i18n'
import { mapsLinks, telHref } from '../lib/maps'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

/** /about — institutional About copy (messages); contact sidebar from institution settings. */
export function AboutPage() {
  const { locale, ready } = useI18n()
  const t = useT('about')
  const tCommon = useT('common')
  const tContact = useT('contact')
  const tSeo = useT('seo')
  const [institution, setInstitution] = useState<Institution | null>(null)

  useEffect(() => {
    institutionApi.get().then(setInstitution).catch(() => setInstitution(null))
  }, [])

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  const maps = mapsLinks(institution?.address)
  const bodyKeys = ['body1', 'body2', 'body3'] as const

  usePageHead({
    title: ready ? formatDocumentTitle(t('title'), officeName) : null,
    description: ready ? tSeo('aboutDescription', { name: officeName }) : null,
    path: '/about',
    locale,
  })

  return (
    <main id="main-content" className="inner-page">
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{t('title')}</h1>
      </div>
      <section className="container about-layout">
        <div className="about-main">
          {bodyKeys.map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
        <aside className="side-card">
          <span className="eyebrow">{tCommon('officeInformation')}</span>
          <h3>{institution?.shortName ?? officeName}</h3>
          <dl>
            <dt>{tContact('address')}</dt>
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
            <dt>{tContact('phone')}</dt>
            <dd>
              {institution?.phone ? (
                <a href={telHref(institution.phone)}>{institution.phone}</a>
              ) : (
                '—'
              )}
            </dd>
            <dt>{tContact('email')}</dt>
            <dd>
              {institution?.email ? (
                <a href={`mailto:${institution.email}`}>{institution.email}</a>
              ) : (
                '—'
              )}
            </dd>
            <dt>{tContact('hours')}</dt>
            <dd>{institution?.hours ?? '—'}</dd>
          </dl>
          <Link className="button button-dark" to="/contact">
            {tCommon('contact')}
          </Link>
        </aside>
      </section>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { CatalogState } from '../components/CatalogState'
import {
  departmentsApi,
  institutionApi,
  peopleApi,
  type Institution,
  type PublicDepartment,
  type PublicPerson,
} from '../lib/api-client'
import { useI18n, useT } from '../lib/i18n'
import { telHref } from '../lib/maps'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

type OrgData = { departments: PublicDepartment[]; leadership: PublicPerson[] }

/** /organization — published departments + leadership from the CMS (no static records). */
export function OrganizationPage() {
  const { locale, ready } = useI18n()
  const t = useT('organization')
  const tCommon = useT('common')
  const tSeo = useT('seo')
  const [data, setData] = useState<OrgData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [institution, setInstitution] = useState<Institution | null>(null)

  function load() {
    setData(null)
    setError(null)
    Promise.all([departmentsApi.list(locale), peopleApi.leadership(locale)])
      .then(([departments, leadership]) => setData({ departments, leadership }))
      .catch((err: Error) => setError(err.message))
  }

  // ponytail: refetch per locale so the API resolves translations server-side
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [locale])

  useEffect(() => {
    institutionApi.get().then(setInstitution).catch(() => setInstitution(null))
  }, [])

  const name = institution?.name ?? siteTemplate.fallbackInstitutionName
  usePageHead({
    title: ready ? formatDocumentTitle(t('title'), name) : null,
    description: ready ? tSeo('organizationDescription', { name }) : null,
    path: '/organization',
    locale,
  })

  const loading = data === null && !error
  const empty = data !== null && data.departments.length === 0 && data.leadership.length === 0
  const usedFallback =
    data !== null && [...data.departments, ...data.leadership].some((item) => item.usedFallback)

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{t('title')}</h1>
        <p>{t('intro', { name })}</p>
      </div>

      <section className="container directory">
        <CatalogState
          loading={loading}
          error={error}
          empty={empty}
          emptyTitle={t('emptyTitle')}
          emptyBody={t('emptyBody')}
          loadErrorTitle={t('loadError')}
          tryAgainLabel={t('tryAgain')}
          noMatchLabel=""
          onRetry={load}
          emptyCtaTo="/contact"
          emptyCtaLabel={tCommon('getInTouch')}
        />

        {data && !empty ? (
          <div className="org-sections catalog-settle">
            {usedFallback ? <p className="org-fallback muted">{t('fallbackNotice')}</p> : null}

            <section aria-labelledby="org-leadership-heading" className="org-section">
              <h2 id="org-leadership-heading">{t('leadershipTitle')}</h2>
              {data.leadership.length === 0 ? (
                <p className="muted">{t('leadershipEmpty')}</p>
              ) : (
                <div className="news-listing">
                  {data.leadership.map((p) => (
                    <article key={p.slug} className="news-card org-card" lang={p.language}>
                      {p.department ? <span className="category">{p.department.name}</span> : null}
                      <h3>{p.fullName}</h3>
                      <p className="org-role">{p.title}</p>
                      {p.bio ? <p className="org-text">{p.bio}</p> : null}
                      {p.email || p.phone ? (
                        <dl className="org-contact">
                          {p.email ? (
                            <>
                              <dt>{t('email')}</dt>
                              <dd>
                                <a href={`mailto:${p.email}`}>{p.email}</a>
                              </dd>
                            </>
                          ) : null}
                          {p.phone ? (
                            <>
                              <dt>{t('phone')}</dt>
                              <dd>
                                <a href={telHref(p.phone)}>{p.phone}</a>
                              </dd>
                            </>
                          ) : null}
                        </dl>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="org-departments-heading" className="org-section">
              <h2 id="org-departments-heading">{t('departmentsTitle')}</h2>
              {data.departments.length === 0 ? (
                <p className="muted">{t('departmentsEmpty')}</p>
              ) : (
                <div className="news-listing">
                  {data.departments.map((d) => (
                    <article key={d.slug} className="news-card org-card" lang={d.language}>
                      <h3>{d.name}</h3>
                      {d.summary ? <p className="org-role">{d.summary}</p> : null}
                      {d.description ? <p className="org-text">{d.description}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { institutionApi, type Institution, type ProfileTranslation } from '../lib/api-client'
import { useI18n, useT, type Locale } from '../lib/i18n'
import { mapsLinks, telHref } from '../lib/maps'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

type ResolvedProfile = {
  mission: string | null
  vision: string | null
  history: string | null
  values: string[]
  objectives: string[]
}

function resolveProfile(inst: Institution | null, locale: Locale): ResolvedProfile {
  if (!inst) {
    return { mission: null, vision: null, history: null, values: [], objectives: [] }
  }
  const tr: ProfileTranslation | undefined =
    locale === 'en' ? undefined : inst.profileTranslations?.[locale]
  const pickText = (key: 'mission' | 'vision' | 'history'): string | null => {
    const localized = tr?.[key]?.trim()
    if (localized) return localized
    const base = inst[key]?.trim()
    return base || null
  }
  const pickList = (key: 'values' | 'objectives'): string[] => {
    const localized = tr?.[key]
    if (localized && localized.length > 0) return localized
    return inst[key] ?? []
  }
  return {
    mission: pickText('mission'),
    vision: pickText('vision'),
    history: pickText('history'),
    values: pickList('values'),
    objectives: pickList('objectives'),
  }
}

/** /about — institutional About copy + CMS profile fields when present. */
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
  const profile = useMemo(() => resolveProfile(institution, locale), [institution, locale])
  const hasProfile =
    Boolean(profile.mission) ||
    Boolean(profile.vision) ||
    Boolean(profile.history) ||
    profile.values.length > 0 ||
    profile.objectives.length > 0

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

          {hasProfile ? (
            <div className="about-profile">
              {profile.mission ? (
                <section className="about-profile-block">
                  <h2>{t('mission')}</h2>
                  <p>{profile.mission}</p>
                </section>
              ) : null}
              {profile.vision ? (
                <section className="about-profile-block">
                  <h2>{t('vision')}</h2>
                  <p>{profile.vision}</p>
                </section>
              ) : null}
              {profile.history ? (
                <section className="about-profile-block">
                  <h2>{t('history')}</h2>
                  <p className="about-history">{profile.history}</p>
                </section>
              ) : null}
              {profile.values.length > 0 ? (
                <section className="about-profile-block">
                  <h2>{t('values')}</h2>
                  <ul>
                    {profile.values.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {profile.objectives.length > 0 ? (
                <section className="about-profile-block">
                  <h2>{t('objectives')}</h2>
                  <ul>
                    {profile.objectives.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
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

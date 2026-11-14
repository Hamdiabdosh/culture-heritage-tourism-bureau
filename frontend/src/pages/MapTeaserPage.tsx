import { Link } from 'react-router-dom'
import { useI18n, useT } from '../lib/i18n'
import { siteTemplate } from '../lib/site-template'
import { formatDocumentTitle } from '../lib/use-document-title'
import { usePageHead } from '../lib/use-page-head'

export function MapTeaserPage() {
  const { locale } = useI18n()
  const t = useT('map')
  const tNav = useT('navigation')

  usePageHead({
    title: formatDocumentTitle(t('title'), siteTemplate.fallbackInstitutionName),
    description: t('intro'),
    path: '/map',
    locale,
  })

  return (
    <main id="main-content" className="inner-page">
      <section className="map-teaser">
        <div className="container">
          <span className="eyebrow light">{t('eyebrow')}</span>
          <h2>{t('title')}</h2>
          <p>{t('intro')}</p>
          <div className="hero-actions">
            <Link className="button button-light" to="/explore">
              {tNav('explore')}
            </Link>
            <Link className="button button-ghost" to="/plan">
              {tNav('plan')}
            </Link>
          </div>
        </div>
      </section>
      <section className="container section section-compact">
        <p className="muted">{t('comingSoon')}</p>
      </section>
    </main>
  )
}

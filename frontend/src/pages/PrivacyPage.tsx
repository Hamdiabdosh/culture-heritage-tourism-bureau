import { Link } from 'react-router-dom'
import { useI18n, useT } from '../lib/i18n'
import { usePageHead } from '../lib/use-page-head'
import { formatDocumentTitle } from '../lib/use-document-title'
import { siteTemplate } from '../lib/site-template'

export function PrivacyPage() {
  const { locale } = useI18n()
  const t = useT('privacy')
  const tNav = useT('navigation')

  usePageHead({
    title: formatDocumentTitle(t('title'), siteTemplate.fallbackInstitutionName),
    description: t('metaDescription'),
    path: '/privacy',
    locale,
  })

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="container page-intro">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1>{t('title')}</h1>
        <p>{t('intro')}</p>
      </div>
      <section className="container about-main privacy-body">
        <h2>{t('collectTitle')}</h2>
        <p>{t('collectBody')}</p>
        <ul>
          <li>{t('collectCookies')}</li>
          <li>{t('collectAccounts')}</li>
          <li>{t('collectLogs')}</li>
        </ul>
        <h2>{t('storageTitle')}</h2>
        <p>{t('storageBody')}</p>
        <h2>{t('phonesTitle')}</h2>
        <p>{t('phonesBody')}</p>
        <h2>{t('rightsTitle')}</h2>
        <p>{t('rightsBody')}</p>
        <p className="privacy-contact">
          <Link to="/contact">{tNav('contact')}</Link>
        </p>
      </section>
    </main>
  )
}

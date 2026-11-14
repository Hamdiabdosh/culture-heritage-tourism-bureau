import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Footer, SiteHeader } from '@/components/institution-site'

export default async function NotFound() {
  const t = await getTranslations('notFound')

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">404</span>
          <h1>{t('title')}</h1>
          <p>{t('body')}</p>
          <div className="hero-actions">
            <Link href="/" className="button button-dark">
              {t('returnHome')}
            </Link>
            <Link href="/services" className="button button-outline">
              {t('browseServices')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

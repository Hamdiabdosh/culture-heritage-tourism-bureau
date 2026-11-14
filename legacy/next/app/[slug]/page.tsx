import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Footer, SiteHeader } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { getPublishedPageBySlug } from '@/lib/content/pages'
import { getRequestLanguage } from '@/lib/content/public-language'
import { contentMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

/**
 * Explicit app routes own these paths; do not serve CMS pages under them
 * even if a published page somehow shares the slug.
 */
const RESERVED_SLUGS = new Set([
  'about',
  'api',
  'cms',
  'events',
  'login',
  'news',
  'resources',
  'services',
])

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (!slug || RESERVED_SLUGS.has(slug)) return {}

  const { lang } = await searchParams
  const language = await getRequestLanguage(lang)
  const institutionId = await getActiveInstitutionId()
  const page = await getPublishedPageBySlug(institutionId, slug, language)
  if (!page) return {}

  const description = page.content?.trim().slice(0, 160) || page.title
  return contentMetadata(page.title, description)
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { slug } = await params
  const { lang } = await searchParams

  if (!slug || RESERVED_SLUGS.has(slug)) {
    notFound()
  }

  const language = await getRequestLanguage(lang)
  const institutionId = await getActiveInstitutionId()
  const page = await getPublishedPageBySlug(institutionId, slug, language)

  if (!page) {
    notFound()
  }

  const t = await getTranslations('common')
  const paragraphs = (page.content ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">{t('information')}</span>
          <h1>{page.title}</h1>
        </div>
        <section className="container article reveal">
          <div className="article-content">
            {paragraphs.length === 0 ? (
              <p className="muted">{t('noPageContent')}</p>
            ) : (
              paragraphs.map((para, i) => <p key={i}>{para}</p>)
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

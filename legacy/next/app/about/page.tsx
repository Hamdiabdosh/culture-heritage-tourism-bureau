import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { AboutPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { getPublishedPageBySlug } from '@/lib/content/pages'
import { getRequestLanguage } from '@/lib/content/public-language'
import { institution } from '@/lib/institution-config'
import { contentMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const { lang } = await searchParams
  const language = await getRequestLanguage(lang)
  const institutionId = await getActiveInstitutionId()
  const page = await getPublishedPageBySlug(institutionId, 'about', language)
  const t = await getTranslations('seo')

  if (!page) {
    return contentMetadata(
      institution.name,
      t('aboutDescription', { name: institution.name }),
    )
  }

  const description =
    page.content?.trim().slice(0, 160) ||
    t('aboutDescription', { name: institution.name })

  return contentMetadata(page.title, description)
}

/** Explicit /about route — reads the published CMS page with slug `about`. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const language = await getRequestLanguage(lang)
  const institutionId = await getActiveInstitutionId()
  const page = await getPublishedPageBySlug(institutionId, 'about', language)

  if (!page) {
    notFound()
  }

  return <AboutPage title={page.title} content={page.content ?? ''} />
}

import { getLocale, getTranslations } from 'next-intl/server'
import { NewsPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { listPublishedNews } from '@/lib/content/news'
import { formatPublicDate } from '@/lib/content/public-format'
import type { News } from '@/lib/db/schema'
import { institution } from '@/lib/institution-config'
import { titledMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

function toPublicCard(item: News, locale: string) {
  const summary =
    item.summary?.trim() ||
    (item.content?.trim().slice(0, 160) ?? '') ||
    item.title

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary,
    category: item.category?.trim() || 'Update',
    date: formatPublicDate(item.publishedAt ?? item.createdAt, locale),
  }
}

export async function generateMetadata() {
  const tNav = await getTranslations('navigation')
  const t = await getTranslations('news')
  return titledMetadata(tNav('news'), t('intro', { name: institution.name }))
}

export default async function Page() {
  const locale = await getLocale()
  const institutionId = await getActiveInstitutionId()
  const items = await listPublishedNews(institutionId)

  return <NewsPage items={items.map((item) => toPublicCard(item, locale))} />
}

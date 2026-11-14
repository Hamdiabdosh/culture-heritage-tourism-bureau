import { getLocale, getTranslations } from 'next-intl/server'
import { HomePage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import {
  formatDocumentMeta,
  listPublishedDocuments,
} from '@/lib/content/documents'
import { formatEventDateParts, listPublishedEvents } from '@/lib/content/events'
import { listPublishedNews } from '@/lib/content/news'
import { formatPublicDate } from '@/lib/content/public-format'
import { listPublishedServices } from '@/lib/content/services'
import type { News } from '@/lib/db/schema'
import { institution } from '@/lib/institution-config'
import { publicMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

function toPublicNewsCard(item: News, locale: string) {
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
  const t = await getTranslations('seo')
  return publicMetadata({
    title: t('homeTitle', { name: institution.name }),
    description: t('homeDescription', { name: institution.name }),
  })
}

export default async function Page() {
  const locale = await getLocale()
  const institutionId = await getActiveInstitutionId()
  const [services, newsItems, documents, events] = await Promise.all([
    listPublishedServices(institutionId),
    listPublishedNews(institutionId),
    listPublishedDocuments(institutionId),
    listPublishedEvents(institutionId),
  ])

  const upcoming = events[0]
  const eventParts = upcoming ? formatEventDateParts(upcoming.eventDate, locale) : null
  const featuredEvent =
    upcoming && eventParts
      ? {
          id: upcoming.id,
          slug: upcoming.slug,
          title: upcoming.title,
          summary: upcoming.summary ?? '',
          location: upcoming.location ?? '',
          type: upcoming.type ?? 'Event',
          day: eventParts.day,
          month: eventParts.month,
          year: eventParts.year,
        }
      : null

  return (
    <HomePage
      services={services.slice(0, 4).map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary ?? '',
        icon: item.icon || 'file',
      }))}
      news={newsItems.map((item) => toPublicNewsCard(item, locale))}
      documents={documents.slice(0, 3).map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary ?? '',
        category: item.category || 'Document',
        meta: formatDocumentMeta(item),
      }))}
      featuredEvent={featuredEvent}
    />
  )
}

export const viewport = { themeColor: '#173c34' }

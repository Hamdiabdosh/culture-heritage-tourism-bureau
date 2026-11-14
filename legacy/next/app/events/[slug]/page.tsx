import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { EventDetailPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { formatEventDateParts, getPublishedEventBySlug } from '@/lib/content/events'
import { contentMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedEventBySlug(institutionId, slug)
  if (!item) return {}
  return contentMetadata(item.title, item.summary || item.content)
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const locale = await getLocale()
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedEventBySlug(institutionId, slug)

  if (!item) {
    notFound()
  }

  const parts = formatEventDateParts(item.eventDate, locale)

  return (
    <EventDetailPage
      event={{
        title: item.title,
        summary: item.summary ?? '',
        content: item.content ?? '',
        location: item.location ?? '',
        type: item.type ?? 'Event',
        day: parts.day,
        month: parts.month,
        year: parts.year,
        dateLabel: parts.label,
      }}
    />
  )
}

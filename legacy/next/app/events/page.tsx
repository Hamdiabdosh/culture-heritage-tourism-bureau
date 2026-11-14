import { getLocale, getTranslations } from 'next-intl/server'
import { EventsPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { formatEventDateParts, listPublishedEvents } from '@/lib/content/events'
import { institution } from '@/lib/institution-config'
import { titledMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const tNav = await getTranslations('navigation')
  const t = await getTranslations('events')
  return titledMetadata(tNav('events'), t('intro', { name: institution.name }))
}

export default async function Page() {
  const locale = await getLocale()
  const institutionId = await getActiveInstitutionId()
  const items = await listPublishedEvents(institutionId)

  return (
    <EventsPage
      items={items.map((item) => {
        const parts = formatEventDateParts(item.eventDate, locale)
        return {
          id: item.id,
          slug: item.slug,
          title: item.title,
          summary: item.summary ?? '',
          location: item.location ?? '',
          type: item.type ?? 'Event',
          day: parts.day,
          month: parts.month,
          year: parts.year,
        }
      })}
    />
  )
}

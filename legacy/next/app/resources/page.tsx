import { getTranslations } from 'next-intl/server'
import { ResourcesPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import {
  formatDocumentMeta,
  listPublishedDocuments,
} from '@/lib/content/documents'
import { institution } from '@/lib/institution-config'
import { titledMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const tNav = await getTranslations('navigation')
  const t = await getTranslations('resources')
  return titledMetadata(tNav('resources'), t('intro', { name: institution.name }))
}

export default async function Page() {
  const institutionId = await getActiveInstitutionId()
  const items = await listPublishedDocuments(institutionId)

  return (
    <ResourcesPage
      items={items.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary ?? '',
        category: item.category || 'Document',
        meta: formatDocumentMeta(item),
      }))}
    />
  )
}

import { getTranslations } from 'next-intl/server'
import { DirectoryPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { listPublishedServices } from '@/lib/content/services'
import { institution } from '@/lib/institution-config'
import { titledMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const tNav = await getTranslations('navigation')
  const t = await getTranslations('services')
  return titledMetadata(
    tNav('services'),
    t('directoryIntro', { name: institution.name }),
  )
}

export default async function Page() {
  const institutionId = await getActiveInstitutionId()
  const items = await listPublishedServices(institutionId)

  return (
    <DirectoryPage
      items={items.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary ?? '',
        icon: item.icon || 'file',
      }))}
    />
  )
}

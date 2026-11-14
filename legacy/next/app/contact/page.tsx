import { getTranslations } from 'next-intl/server'
import { ContactPage } from '@/components/institution-site'
import { institution } from '@/lib/institution-config'
import { titledMetadata } from '@/lib/public-metadata'

export async function generateMetadata() {
  const tNav = await getTranslations('navigation')
  const t = await getTranslations('contact')
  return titledMetadata(tNav('contact'), t('intro', { name: institution.name }))
}

export default function Page() {
  return <ContactPage />
}

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ServiceDetailPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { getPublishedServiceBySlug } from '@/lib/content/services'
import { contentMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedServiceBySlug(institutionId, slug)
  if (!item) return {}
  return contentMetadata(item.title, item.summary || item.description)
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedServiceBySlug(institutionId, slug)

  if (!item) {
    notFound()
  }

  return (
    <ServiceDetailPage
      service={{
        title: item.title,
        summary: item.summary ?? '',
        description: item.description ?? '',
        category: item.category ?? 'Service',
        process: item.process ?? [],
        icon: item.icon || 'file',
        responsibleOffice: item.responsibleOffice ?? '',
        eligibility: item.eligibility ?? '',
        contact: item.contact ?? '',
        requiredDocuments: item.requiredDocuments ?? [],
      }}
    />
  )
}

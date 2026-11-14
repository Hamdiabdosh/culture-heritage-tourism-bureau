import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ResourceDetailPage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import {
  formatDocumentMeta,
  getPublishedDocumentBySlug,
} from '@/lib/content/documents'
import { contentMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedDocumentBySlug(institutionId, slug)
  if (!item) return {}
  return contentMetadata(item.title, item.summary)
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedDocumentBySlug(institutionId, slug)

  if (!item) {
    notFound()
  }

  return (
    <ResourceDetailPage
      document={{
        title: item.title,
        summary: item.summary ?? '',
        category: item.category ?? '',
        year: item.year ?? '',
        fileUrl: item.fileUrl ?? '',
        fileType: item.fileType ?? '',
        fileSize: item.fileSize ?? '',
        meta: formatDocumentMeta(item),
      }}
    />
  )
}

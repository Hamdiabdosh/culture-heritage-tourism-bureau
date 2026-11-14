import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { ArticlePage } from '@/components/institution-site'
import { getActiveInstitutionId } from '@/lib/content/institution'
import { getPublishedNewsBySlug } from '@/lib/content/news'
import { formatPublicDate } from '@/lib/content/public-format'
import { contentMetadata } from '@/lib/public-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedNewsBySlug(institutionId, slug)
  if (!item) return {}
  const description =
    item.summary?.trim() || item.content?.trim().slice(0, 160) || item.title
  return contentMetadata(item.title, description)
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const locale = await getLocale()
  const institutionId = await getActiveInstitutionId()
  const item = await getPublishedNewsBySlug(institutionId, slug)

  if (!item) {
    notFound()
  }

  return (
    <ArticlePage
      title={item.title}
      category={item.category?.trim() || 'Update'}
      date={formatPublicDate(item.publishedAt ?? item.createdAt, locale)}
      summary={item.summary?.trim() || ''}
      content={item.content?.trim() || ''}
    />
  )
}

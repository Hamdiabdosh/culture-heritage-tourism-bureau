import type { Metadata } from 'next'
import { institution, seoDefaults } from '@/lib/institution-config'

/** Build public page metadata with Open Graph; keep it small. */
export function publicMetadata(opts: {
  title: string
  description?: string | null
}): Metadata {
  const description =
    opts.description?.trim() || seoDefaults.description
  return {
    title: opts.title,
    description,
    openGraph: {
      title: opts.title,
      description,
    },
  }
}

/** `Page title | NPSO` style for listings and CMS chrome titles. */
export function titledMetadata(
  pageLabel: string,
  description?: string | null,
): Metadata {
  return publicMetadata({
    title: `${pageLabel} | ${institution.shortName}`,
    description,
  })
}

/** Dynamic content title with institution short name. */
export function contentMetadata(
  contentTitle: string,
  description?: string | null,
): Metadata {
  return publicMetadata({
    title: `${contentTitle} | ${institution.shortName}`,
    description,
  })
}

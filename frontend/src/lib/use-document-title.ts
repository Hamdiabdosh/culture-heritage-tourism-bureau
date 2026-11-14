import { useEffect } from 'react'
import { siteTemplate } from './site-template'

/** Compose `Page | Office` for document titles. */
export function formatDocumentTitle(pageTitle?: string | null, officeName?: string | null) {
  const base = (officeName?.trim() || siteTemplate.fallbackInstitutionName).trim()
  const page = pageTitle?.trim()
  return page ? `${page} | ${base}` : base
}

/** Sets `document.title` (pass a fully composed string). */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    if (title?.trim()) document.title = title.trim()
  }, [title])
}

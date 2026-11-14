export type PageStatus = 'draft' | 'published' | 'archived'

export const PAGE_STATUSES: PageStatus[] = ['draft', 'published', 'archived']

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeSlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug)
}

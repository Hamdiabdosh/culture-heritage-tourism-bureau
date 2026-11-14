import { and, desc, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { PAGE_STATUSES, isValidSlug, normalizeSlug, type PageStatus } from '@/lib/content/page-fields'
import {
  emptyPageTranslations,
  normalizePageTranslations,
  resolveLanguageCode,
  resolvePageContent,
  type PageTranslations,
} from '@/lib/content/page-translations'

export type { PageStatus, PageTranslations }
export { normalizeSlug, resolveLanguageCode, resolvePageContent }

export type PageInput = {
  title: string
  slug: string
  content?: string | null
  status: PageStatus
  translations?: PageTranslations
}

export class PageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PageValidationError'
  }
}

export class PageConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PageConflictError'
  }
}

export class PageNotFoundError extends Error {
  constructor(message = 'Page not found.') {
    super(message)
    this.name = 'PageNotFoundError'
  }
}

export function validatePageInput(input: {
  title?: string | null
  slug?: string | null
  content?: string | null
  status?: string | null
  translations?: PageTranslations | null
}): PageInput {
  const title = input.title?.trim() ?? ''
  const slug = normalizeSlug(input.slug ?? '')
  const content = input.content?.trim() ? input.content.trim() : null
  const status = (input.status ?? 'draft') as PageStatus
  const translations = normalizePageTranslations(input.translations)

  if (!title) {
    throw new PageValidationError('Title is required.')
  }

  if (!slug) {
    throw new PageValidationError('Slug is required.')
  }

  if (!isValidSlug(slug)) {
    throw new PageValidationError(
      'Slug must use lowercase letters, numbers, and hyphens only.',
    )
  }

  if (!PAGE_STATUSES.includes(status)) {
    throw new PageValidationError('Invalid status.')
  }

  return { title, slug, content, status, translations }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

export async function listPages(institutionId: string) {
  return db
    .select()
    .from(pages)
    .where(eq(pages.institutionId, institutionId))
    .orderBy(desc(pages.updatedAt))
}

/** Public listing — published pages only. */
export async function listPublishedPages(institutionId: string) {
  return db
    .select()
    .from(pages)
    .where(and(eq(pages.institutionId, institutionId), eq(pages.status, 'published')))
    .orderBy(desc(pages.updatedAt))
}

export async function getPageById(institutionId: string, id: string) {
  const rows = await db
    .select()
    .from(pages)
    .where(and(eq(pages.institutionId, institutionId), eq(pages.id, id)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Public detail — published only; draft/archived never returned.
 * Optional language resolves title/content from translations with English fallback.
 */
export async function getPublishedPageBySlug(
  institutionId: string,
  slug: string,
  language?: string | null,
) {
  const rows = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.institutionId, institutionId),
        eq(pages.slug, slug),
        eq(pages.status, 'published'),
      ),
    )
    .limit(1)

  const page = rows[0]
  if (!page) return null

  const resolved = resolvePageContent(page, language)
  return {
    ...page,
    title: resolved.title,
    content: resolved.content,
    language: resolved.language,
    usedFallback: resolved.usedFallback,
  }
}

export async function createPage(institutionId: string, input: PageInput) {
  try {
    const [created] = await db
      .insert(pages)
      .values({
        institutionId,
        title: input.title,
        slug: input.slug,
        content: input.content,
        translations: input.translations ?? emptyPageTranslations(),
        status: input.status,
      })
      .returning()

    return created
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PageConflictError('A page with this slug already exists.')
    }
    throw error
  }
}

export async function updatePage(institutionId: string, id: string, input: PageInput) {
  const existing = await getPageById(institutionId, id)
  if (!existing) {
    throw new PageNotFoundError()
  }

  // Fail early with a clear message when another page already owns the slug.
  const conflict = await db
    .select({ id: pages.id })
    .from(pages)
    .where(
      and(
        eq(pages.institutionId, institutionId),
        eq(pages.slug, input.slug),
        ne(pages.id, id),
      ),
    )
    .limit(1)

  if (conflict[0]) {
    throw new PageConflictError('A page with this slug already exists.')
  }

  try {
    const [updated] = await db
      .update(pages)
      .set({
        title: input.title,
        slug: input.slug,
        content: input.content,
        translations: input.translations ?? emptyPageTranslations(),
        status: input.status,
      })
      .where(and(eq(pages.institutionId, institutionId), eq(pages.id, id)))
      .returning()

    if (!updated) {
      throw new PageNotFoundError()
    }

    return updated
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PageConflictError('A page with this slug already exists.')
    }
    throw error
  }
}

/** Soft-remove via archived status (keeps history, matches content_status enum). */
export async function archivePage(institutionId: string, id: string) {
  const existing = await getPageById(institutionId, id)
  if (!existing) {
    throw new PageNotFoundError()
  }

  const [updated] = await db
    .update(pages)
    .set({ status: 'archived' })
    .where(and(eq(pages.institutionId, institutionId), eq(pages.id, id)))
    .returning()

  return updated
}

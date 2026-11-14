import { and, desc, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { news } from '@/lib/db/schema'
import { PAGE_STATUSES, isValidSlug, normalizeSlug, type PageStatus } from '@/lib/content/page-fields'

export type NewsStatus = PageStatus

export type NewsInput = {
  title: string
  slug: string
  summary: string
  category: string
  content: string
  status: NewsStatus
}

export class NewsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NewsValidationError'
  }
}

export class NewsConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NewsConflictError'
  }
}

export class NewsNotFoundError extends Error {
  constructor(message = 'News item not found.') {
    super(message)
    this.name = 'NewsNotFoundError'
  }
}

export function validateNewsInput(input: {
  title?: string | null
  slug?: string | null
  summary?: string | null
  category?: string | null
  content?: string | null
  status?: string | null
}): NewsInput {
  const title = input.title?.trim() ?? ''
  const slug = normalizeSlug(input.slug ?? '')
  const summary = input.summary?.trim() ?? ''
  const category = input.category?.trim() ?? ''
  const content = input.content?.trim() ?? ''
  const status = (input.status ?? 'draft') as NewsStatus

  if (!title) {
    throw new NewsValidationError('Title is required.')
  }

  if (!slug) {
    throw new NewsValidationError('Slug is required.')
  }

  if (!isValidSlug(slug)) {
    throw new NewsValidationError(
      'Slug must use lowercase letters, numbers, and hyphens only.',
    )
  }

  if (!content) {
    throw new NewsValidationError('Content is required.')
  }

  if (!PAGE_STATUSES.includes(status)) {
    throw new NewsValidationError('Invalid status.')
  }

  return { title, slug, summary, category, content, status }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

export async function listNews(institutionId: string) {
  return db
    .select()
    .from(news)
    .where(eq(news.institutionId, institutionId))
    .orderBy(desc(news.updatedAt))
}

/** Public listing — published items only, newest first. */
export async function listPublishedNews(institutionId: string) {
  return db
    .select()
    .from(news)
    .where(and(eq(news.institutionId, institutionId), eq(news.status, 'published')))
    .orderBy(desc(news.publishedAt), desc(news.createdAt))
}

export async function getNewsById(institutionId: string, id: string) {
  const rows = await db
    .select()
    .from(news)
    .where(and(eq(news.institutionId, institutionId), eq(news.id, id)))
    .limit(1)

  return rows[0] ?? null
}

/** Public detail — published only; draft/archived never returned. */
export async function getPublishedNewsBySlug(institutionId: string, slug: string) {
  const rows = await db
    .select()
    .from(news)
    .where(
      and(
        eq(news.institutionId, institutionId),
        eq(news.slug, slug),
        eq(news.status, 'published'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function createNews(institutionId: string, input: NewsInput) {
  try {
    const [created] = await db
      .insert(news)
      .values({
        institutionId,
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        category: input.category || null,
        content: input.content,
        status: input.status,
        publishedAt: input.status === 'published' ? new Date() : null,
      })
      .returning()

    return created
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new NewsConflictError('A news item with this slug already exists.')
    }
    throw error
  }
}

export async function updateNews(institutionId: string, id: string, input: NewsInput) {
  const existing = await getNewsById(institutionId, id)
  if (!existing) {
    throw new NewsNotFoundError()
  }

  const conflict = await db
    .select({ id: news.id })
    .from(news)
    .where(
      and(eq(news.institutionId, institutionId), eq(news.slug, input.slug), ne(news.id, id)),
    )
    .limit(1)

  if (conflict[0]) {
    throw new NewsConflictError('A news item with this slug already exists.')
  }

  try {
    const [updated] = await db
      .update(news)
      .set({
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        category: input.category || null,
        content: input.content,
        status: input.status,
        publishedAt:
          input.status === 'published'
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
      })
      .where(and(eq(news.institutionId, institutionId), eq(news.id, id)))
      .returning()

    if (!updated) {
      throw new NewsNotFoundError()
    }

    return updated
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new NewsConflictError('A news item with this slug already exists.')
    }
    throw error
  }
}

export async function archiveNews(institutionId: string, id: string) {
  const existing = await getNewsById(institutionId, id)
  if (!existing) {
    throw new NewsNotFoundError()
  }

  const [updated] = await db
    .update(news)
    .set({ status: 'archived' })
    .where(and(eq(news.institutionId, institutionId), eq(news.id, id)))
    .returning()

  return updated
}

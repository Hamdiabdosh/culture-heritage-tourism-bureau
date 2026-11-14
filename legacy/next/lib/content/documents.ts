import { and, desc, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { PAGE_STATUSES, isValidSlug, normalizeSlug, type PageStatus } from '@/lib/content/page-fields'

export type DocumentStatus = PageStatus

export type DocumentInput = {
  title: string
  slug: string
  summary: string
  category: string
  year: string
  fileUrl: string
  fileType: string
  fileSize: string
  status: DocumentStatus
}

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentValidationError'
  }
}

export class DocumentConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentConflictError'
  }
}

export class DocumentNotFoundError extends Error {
  constructor(message = 'Document not found.') {
    super(message)
    this.name = 'DocumentNotFoundError'
  }
}

/**
 * Empty, root-relative (`/files/...`), or http(s) absolute URLs.
 * Rejects javascript:/data:/protocol-relative and other non-HTTP schemes.
 */
export function isAllowedDocumentFileUrl(value: string): boolean {
  if (!value) return true
  if (value.startsWith('//')) return false
  if (value.startsWith('/')) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateDocumentInput(input: {
  title?: string | null
  slug?: string | null
  summary?: string | null
  category?: string | null
  year?: string | null
  fileUrl?: string | null
  fileType?: string | null
  fileSize?: string | null
  status?: string | null
}): DocumentInput {
  const title = input.title?.trim() ?? ''
  const slug = normalizeSlug(input.slug ?? '')
  const summary = input.summary?.trim() ?? ''
  const category = input.category?.trim() ?? ''
  const year = input.year?.trim() ?? ''
  const fileUrl = input.fileUrl?.trim() ?? ''
  const fileType = input.fileType?.trim() ?? ''
  const fileSize = input.fileSize?.trim() ?? ''
  const status = (input.status ?? 'draft') as DocumentStatus

  if (!title) {
    throw new DocumentValidationError('Title is required.')
  }

  if (!slug) {
    throw new DocumentValidationError('Slug is required.')
  }

  if (!isValidSlug(slug)) {
    throw new DocumentValidationError(
      'Slug must use lowercase letters, numbers, and hyphens only.',
    )
  }

  if (!PAGE_STATUSES.includes(status)) {
    throw new DocumentValidationError('Invalid status.')
  }

  if (!isAllowedDocumentFileUrl(fileUrl)) {
    throw new DocumentValidationError(
      'File URL must be a relative path or an HTTP/HTTPS URL.',
    )
  }

  return {
    title,
    slug,
    summary,
    category,
    year,
    fileUrl,
    fileType,
    fileSize,
    status,
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

export async function listDocuments(institutionId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.institutionId, institutionId))
    .orderBy(desc(documents.updatedAt))
}

export async function listPublishedDocuments(institutionId: string) {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.institutionId, institutionId), eq(documents.status, 'published')))
    .orderBy(desc(documents.updatedAt))
}

export async function getDocumentById(institutionId: string, id: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.institutionId, institutionId), eq(documents.id, id)))
    .limit(1)

  return rows[0] ?? null
}

export async function getDocumentBySlug(institutionId: string, slug: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.institutionId, institutionId), eq(documents.slug, slug)))
    .limit(1)

  return rows[0] ?? null
}

export async function getPublishedDocumentBySlug(institutionId: string, slug: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.institutionId, institutionId),
        eq(documents.slug, slug),
        eq(documents.status, 'published'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function createDocument(institutionId: string, input: DocumentInput) {
  try {
    const [created] = await db
      .insert(documents)
      .values({
        institutionId,
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        category: input.category || null,
        year: input.year || null,
        fileUrl: input.fileUrl || null,
        fileType: input.fileType || null,
        fileSize: input.fileSize || null,
        status: input.status,
      })
      .returning()

    return created
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DocumentConflictError('A document with this slug already exists.')
    }
    throw error
  }
}

export async function updateDocument(institutionId: string, id: string, input: DocumentInput) {
  const existing = await getDocumentById(institutionId, id)
  if (!existing) {
    throw new DocumentNotFoundError()
  }

  const conflict = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.institutionId, institutionId),
        eq(documents.slug, input.slug),
        ne(documents.id, id),
      ),
    )
    .limit(1)

  if (conflict[0]) {
    throw new DocumentConflictError('A document with this slug already exists.')
  }

  try {
    const [updated] = await db
      .update(documents)
      .set({
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        category: input.category || null,
        year: input.year || null,
        fileUrl: input.fileUrl || null,
        fileType: input.fileType || null,
        fileSize: input.fileSize || null,
        status: input.status,
      })
      .where(and(eq(documents.institutionId, institutionId), eq(documents.id, id)))
      .returning()

    if (!updated) {
      throw new DocumentNotFoundError()
    }

    return updated
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DocumentConflictError('A document with this slug already exists.')
    }
    throw error
  }
}

export async function archiveDocument(institutionId: string, id: string) {
  const existing = await getDocumentById(institutionId, id)
  if (!existing) {
    throw new DocumentNotFoundError()
  }

  const [updated] = await db
    .update(documents)
    .set({ status: 'archived' })
    .where(and(eq(documents.institutionId, institutionId), eq(documents.id, id)))
    .returning()

  return updated
}

/** Listing/detail meta line, e.g. "PDF · 1.8 MB · 2026". */
export function formatDocumentMeta(doc: {
  fileType?: string | null
  fileSize?: string | null
  year?: string | null
}) {
  return [doc.fileType, doc.fileSize, doc.year].filter(Boolean).join(' · ')
}

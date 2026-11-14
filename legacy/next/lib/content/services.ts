import { and, desc, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'
import { PAGE_STATUSES, isValidSlug, normalizeSlug, type PageStatus } from '@/lib/content/page-fields'

export type ServiceStatus = PageStatus

export const SERVICE_ICONS = ['file', 'message', 'megaphone', 'building', 'book'] as const
export type ServiceIcon = (typeof SERVICE_ICONS)[number]

export type ServiceInput = {
  title: string
  slug: string
  summary: string
  description: string
  category: string
  responsibleOffice: string
  eligibility: string
  requiredDocuments: string[]
  process: string[]
  contact: string
  icon: ServiceIcon
  status: ServiceStatus
}

export class ServiceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceValidationError'
  }
}

export class ServiceConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceConflictError'
  }
}

export class ServiceNotFoundError extends Error {
  constructor(message = 'Service not found.') {
    super(message)
    this.name = 'ServiceNotFoundError'
  }
}

function parseLines(value: string | null | undefined) {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function validateServiceInput(input: {
  title?: string | null
  slug?: string | null
  summary?: string | null
  description?: string | null
  category?: string | null
  responsibleOffice?: string | null
  eligibility?: string | null
  requiredDocuments?: string | string[] | null
  process?: string | string[] | null
  contact?: string | null
  icon?: string | null
  status?: string | null
}): ServiceInput {
  const title = input.title?.trim() ?? ''
  const slug = normalizeSlug(input.slug ?? '')
  const summary = input.summary?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  const category = input.category?.trim() ?? ''
  const responsibleOffice = input.responsibleOffice?.trim() ?? ''
  const eligibility = input.eligibility?.trim() ?? ''
  const contact = input.contact?.trim() ?? ''
  const icon = (input.icon?.trim() || 'file') as ServiceIcon
  const status = (input.status ?? 'draft') as ServiceStatus

  const requiredDocuments = Array.isArray(input.requiredDocuments)
    ? input.requiredDocuments.map((d) => d.trim()).filter(Boolean)
    : parseLines(input.requiredDocuments)

  const process = Array.isArray(input.process)
    ? input.process.map((d) => d.trim()).filter(Boolean)
    : parseLines(input.process)

  if (!title) {
    throw new ServiceValidationError('Title is required.')
  }

  if (!slug) {
    throw new ServiceValidationError('Slug is required.')
  }

  if (!isValidSlug(slug)) {
    throw new ServiceValidationError(
      'Slug must use lowercase letters, numbers, and hyphens only.',
    )
  }

  if (!SERVICE_ICONS.includes(icon)) {
    throw new ServiceValidationError('Invalid icon.')
  }

  if (!PAGE_STATUSES.includes(status)) {
    throw new ServiceValidationError('Invalid status.')
  }

  return {
    title,
    slug,
    summary,
    description,
    category,
    responsibleOffice,
    eligibility,
    requiredDocuments,
    process,
    contact,
    icon,
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

export async function listServices(institutionId: string) {
  return db
    .select()
    .from(services)
    .where(eq(services.institutionId, institutionId))
    .orderBy(desc(services.updatedAt))
}

export async function listPublishedServices(institutionId: string) {
  return db
    .select()
    .from(services)
    .where(and(eq(services.institutionId, institutionId), eq(services.status, 'published')))
    .orderBy(desc(services.updatedAt))
}

export async function getServiceById(institutionId: string, id: string) {
  const rows = await db
    .select()
    .from(services)
    .where(and(eq(services.institutionId, institutionId), eq(services.id, id)))
    .limit(1)

  return rows[0] ?? null
}

export async function getServiceBySlug(institutionId: string, slug: string) {
  const rows = await db
    .select()
    .from(services)
    .where(and(eq(services.institutionId, institutionId), eq(services.slug, slug)))
    .limit(1)

  return rows[0] ?? null
}

export async function getPublishedServiceBySlug(institutionId: string, slug: string) {
  const rows = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.institutionId, institutionId),
        eq(services.slug, slug),
        eq(services.status, 'published'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function createService(institutionId: string, input: ServiceInput) {
  try {
    const [created] = await db
      .insert(services)
      .values({
        institutionId,
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        description: input.description || null,
        category: input.category || null,
        responsibleOffice: input.responsibleOffice || null,
        eligibility: input.eligibility || null,
        requiredDocuments: input.requiredDocuments,
        process: input.process,
        contact: input.contact || null,
        icon: input.icon,
        status: input.status,
      })
      .returning()

    return created
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceConflictError('A service with this slug already exists.')
    }
    throw error
  }
}

export async function updateService(institutionId: string, id: string, input: ServiceInput) {
  const existing = await getServiceById(institutionId, id)
  if (!existing) {
    throw new ServiceNotFoundError()
  }

  const conflict = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(eq(services.institutionId, institutionId), eq(services.slug, input.slug), ne(services.id, id)),
    )
    .limit(1)

  if (conflict[0]) {
    throw new ServiceConflictError('A service with this slug already exists.')
  }

  try {
    const [updated] = await db
      .update(services)
      .set({
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        description: input.description || null,
        category: input.category || null,
        responsibleOffice: input.responsibleOffice || null,
        eligibility: input.eligibility || null,
        requiredDocuments: input.requiredDocuments,
        process: input.process,
        contact: input.contact || null,
        icon: input.icon,
        status: input.status,
      })
      .where(and(eq(services.institutionId, institutionId), eq(services.id, id)))
      .returning()

    if (!updated) {
      throw new ServiceNotFoundError()
    }

    return updated
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceConflictError('A service with this slug already exists.')
    }
    throw error
  }
}

export async function archiveService(institutionId: string, id: string) {
  const existing = await getServiceById(institutionId, id)
  if (!existing) {
    throw new ServiceNotFoundError()
  }

  const [updated] = await db
    .update(services)
    .set({ status: 'archived' })
    .where(and(eq(services.institutionId, institutionId), eq(services.id, id)))
    .returning()

  return updated
}

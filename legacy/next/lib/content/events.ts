import { and, asc, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { PAGE_STATUSES, isValidSlug, normalizeSlug, type PageStatus } from '@/lib/content/page-fields'
import { toIntlLocale } from '@/lib/content/public-format'

export type EventStatus = PageStatus

/** Ethiopian government sites use East Africa Time (no DST). */
export const EVENT_TIME_ZONE = 'Africa/Addis_Ababa'
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

export type EventInput = {
  title: string
  slug: string
  summary: string
  content: string
  eventDate: Date
  location: string
  type: string
  status: EventStatus
}

export class EventValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventValidationError'
  }
}

export class EventConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventConflictError'
  }
}

export class EventNotFoundError extends Error {
  constructor(message = 'Event not found.') {
    super(message)
    this.name = 'EventNotFoundError'
  }
}

/**
 * Parse form/API event dates.
 * `datetime-local` values have no timezone — treat them as EAT wall-clock time
 * and store the corresponding absolute Instant in timestamptz.
 */
function parseEventDate(value: string | Date | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) {
    throw new EventValidationError('Event date is required.')
  }

  const localMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  )
  if (localMatch) {
    const [, year, month, day, hour, minute, second = '0'] = localMatch
    // Wall clock in EAT → UTC Instant (EAT is always UTC+3).
    const asIfUtc = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    )
    return new Date(asIfUtc - EAT_OFFSET_MS)
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    throw new EventValidationError('Event date is invalid.')
  }
  return parsed
}

function eatParts(value: Date) {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    formatted.find((part) => part.type === type)?.value ?? ''

  let hour = get('hour')
  // Some engines emit "24" for midnight.
  if (hour === '24') hour = '00'

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
  }
}

export function validateEventInput(input: {
  title?: string | null
  slug?: string | null
  summary?: string | null
  content?: string | null
  eventDate?: string | Date | null
  location?: string | null
  type?: string | null
  status?: string | null
}): EventInput {
  const title = input.title?.trim() ?? ''
  const slug = normalizeSlug(input.slug ?? '')
  const summary = input.summary?.trim() ?? ''
  const content = input.content?.trim() ?? ''
  const location = input.location?.trim() ?? ''
  const type = input.type?.trim() ?? ''
  const status = (input.status ?? 'draft') as EventStatus
  const eventDate = parseEventDate(input.eventDate)

  if (!title) {
    throw new EventValidationError('Title is required.')
  }

  if (!slug) {
    throw new EventValidationError('Slug is required.')
  }

  if (!isValidSlug(slug)) {
    throw new EventValidationError(
      'Slug must use lowercase letters, numbers, and hyphens only.',
    )
  }

  if (!PAGE_STATUSES.includes(status)) {
    throw new EventValidationError('Invalid status.')
  }

  return { title, slug, summary, content, eventDate, location, type, status }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

export async function listEvents(institutionId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.institutionId, institutionId))
    .orderBy(desc(events.eventDate), desc(events.updatedAt))
}

/** Upcoming published events only, nearest first. Uses DB `now()`. */
export async function listPublishedEvents(institutionId: string) {
  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.institutionId, institutionId),
        eq(events.status, 'published'),
        gte(events.eventDate, sql`now()`),
      ),
    )
    .orderBy(asc(events.eventDate))
}

export async function getEventById(institutionId: string, id: string) {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.institutionId, institutionId), eq(events.id, id)))
    .limit(1)

  return rows[0] ?? null
}

export async function getEventBySlug(institutionId: string, slug: string) {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.institutionId, institutionId), eq(events.slug, slug)))
    .limit(1)

  return rows[0] ?? null
}

export async function getPublishedEventBySlug(institutionId: string, slug: string) {
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.institutionId, institutionId),
        eq(events.slug, slug),
        eq(events.status, 'published'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function createEvent(institutionId: string, input: EventInput) {
  try {
    const [created] = await db
      .insert(events)
      .values({
        institutionId,
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        content: input.content || null,
        eventDate: input.eventDate,
        location: input.location || null,
        type: input.type || null,
        status: input.status,
      })
      .returning()

    return created
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new EventConflictError('An event with this slug already exists.')
    }
    throw error
  }
}

export async function updateEvent(institutionId: string, id: string, input: EventInput) {
  const existing = await getEventById(institutionId, id)
  if (!existing) {
    throw new EventNotFoundError()
  }

  const conflict = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(eq(events.institutionId, institutionId), eq(events.slug, input.slug), ne(events.id, id)),
    )
    .limit(1)

  if (conflict[0]) {
    throw new EventConflictError('An event with this slug already exists.')
  }

  try {
    const [updated] = await db
      .update(events)
      .set({
        title: input.title,
        slug: input.slug,
        summary: input.summary || null,
        content: input.content || null,
        eventDate: input.eventDate,
        location: input.location || null,
        type: input.type || null,
        status: input.status,
      })
      .where(and(eq(events.institutionId, institutionId), eq(events.id, id)))
      .returning()

    if (!updated) {
      throw new EventNotFoundError()
    }

    return updated
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new EventConflictError('An event with this slug already exists.')
    }
    throw error
  }
}

export async function archiveEvent(institutionId: string, id: string) {
  const existing = await getEventById(institutionId, id)
  if (!existing) {
    throw new EventNotFoundError()
  }

  const [updated] = await db
    .update(events)
    .set({ status: 'archived' })
    .where(and(eq(events.institutionId, institutionId), eq(events.id, id)))
    .returning()

  return updated
}

/** Display parts in EAT, matching the existing event-card visual style. */
export function formatEventDateParts(value: Date, locale = 'en') {
  const intlLocale = toIntlLocale(locale)

  const day = new Intl.DateTimeFormat(intlLocale, {
    timeZone: EVENT_TIME_ZONE,
    day: '2-digit',
  }).format(value)
  const month = new Intl.DateTimeFormat(intlLocale, {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
  })
    .format(value)
    .toUpperCase()
  const year = new Intl.DateTimeFormat(intlLocale, {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
  }).format(value)
  return { day, month, year, label: `${day} ${month} ${year}` }
}

/** Value for `<input type="datetime-local" />` shown in EAT wall-clock time. */
export function toDatetimeLocalValue(value: Date) {
  const parts = eatParts(value)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

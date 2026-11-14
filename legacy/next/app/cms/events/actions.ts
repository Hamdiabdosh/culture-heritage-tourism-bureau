'use server'

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canModifyContent, enforcePublishingGate, getAuthSession, getSessionRole, type AuthSession } from '@/lib/authz'
import { getActiveInstitutionId, InstitutionConfigError } from '@/lib/content/institution'
import {
  EventConflictError,
  EventNotFoundError,
  EventValidationError,
  archiveEvent,
  createEvent,
  getEventById,
  updateEvent,
  validateEventInput,
} from '@/lib/content/events'
import { cmsSaveSuccessMessage } from '@/lib/cms/workflow-messages'

export type EventActionState = {
  error?: string
  success?: string
}

async function requireEditorSession(): Promise<{ error: string } | { session: AuthSession }> {
  const t = await getTranslations('cms.errors')
  const session = await getAuthSession()

  if (!session) {
    return { error: t('mustSignIn') }
  }

  if (!canModifyContent(getSessionRole(session))) {
    return { error: t('roleCannotModify') }
  }

  return { session }
}

async function mapEventError(error: unknown): Promise<string> {
  if (
    error instanceof EventValidationError ||
    error instanceof EventConflictError ||
    error instanceof EventNotFoundError ||
    error instanceof InstitutionConfigError
  ) {
    return error.message
  }
  console.error('Events CMS error:', error)
  const t = await getTranslations('cms.errors')
  return t('generic')
}

function revalidatePublicEvent(slug: string) {
  revalidatePath('/events')
  revalidatePath(`/events/${slug}`)
  revalidatePath('/')
}

function formInput(formData: FormData) {
  return validateEventInput({
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    summary: String(formData.get('summary') ?? ''),
    content: String(formData.get('content') ?? ''),
    eventDate: String(formData.get('eventDate') ?? ''),
    location: String(formData.get('location') ?? ''),
    type: String(formData.get('type') ?? ''),
    status: String(formData.get('status') ?? 'draft'),
  })
}

export async function createEventAction(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  let eventId: string
  let slug = ''
  try {
    const input = formInput(formData)
    const institutionId = await getActiveInstitutionId()
    input.status = enforcePublishingGate(getSessionRole(access.session), input.status)
    const item = await createEvent(institutionId, input)
    eventId = item.id
    slug = item.slug
  } catch (error) {
    return { error: await mapEventError(error) }
  }

  revalidatePath('/cms/events')
  if (slug) {
    revalidatePublicEvent(slug)
  }
  redirect(`/cms/events/${eventId}?created=1`)
}

export async function updateEventAction(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    return { error: 'Missing event id.' }
  }

  let previousSlug = ''
  let nextSlug = ''
  let previousStatus: string | null = null
  let nextStatus = 'draft'
  try {
    const input = formInput(formData)
    const institutionId = await getActiveInstitutionId()
    const existing = await getEventById(institutionId, id)
    input.status = enforcePublishingGate(
      getSessionRole(access.session),
      input.status,
      existing.status,
    )
    previousSlug = existing?.slug ?? ''
    previousStatus = existing?.status ?? null
    await updateEvent(institutionId, id, input)
    nextSlug = input.slug
    nextStatus = input.status
  } catch (error) {
    return { error: await mapEventError(error) }
  }

  revalidatePath('/cms/events')
  revalidatePath(`/cms/events/${id}`)
  if (nextSlug) {
    revalidatePublicEvent(nextSlug)
  }
  if (previousSlug && previousSlug !== nextSlug) {
    revalidatePublicEvent(previousSlug)
  }
  return { success: await cmsSaveSuccessMessage(nextStatus, previousStatus) }
}

export async function archiveEventAction(formData: FormData): Promise<void> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    redirect(`/cms/events?error=${encodeURIComponent(access.error)}`)
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    redirect('/cms/events?error=Missing%20event%20id.')
  }

  let slug = ''
  try {
    const institutionId = await getActiveInstitutionId()
    const archived = await archiveEvent(institutionId, id)
    slug = archived?.slug ?? ''
  } catch (error) {
    redirect(`/cms/events?error=${encodeURIComponent(await mapEventError(error))}`)
  }

  revalidatePath('/cms/events')
  if (slug) {
    revalidatePublicEvent(slug)
  }
  redirect('/cms/events?archived=1')
}

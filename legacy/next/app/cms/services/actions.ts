'use server'

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canModifyContent, enforcePublishingGate, getAuthSession, getSessionRole, type AuthSession } from '@/lib/authz'
import { getActiveInstitutionId, InstitutionConfigError } from '@/lib/content/institution'
import {
  ServiceConflictError,
  ServiceNotFoundError,
  ServiceValidationError,
  archiveService,
  createService,
  getServiceById,
  updateService,
  validateServiceInput,
} from '@/lib/content/services'
import { cmsSaveSuccessMessage } from '@/lib/cms/workflow-messages'

export type ServiceActionState = {
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

async function mapServiceError(error: unknown): Promise<string> {
  if (
    error instanceof ServiceValidationError ||
    error instanceof ServiceConflictError ||
    error instanceof ServiceNotFoundError ||
    error instanceof InstitutionConfigError
  ) {
    return error.message
  }
  console.error('Services CMS error:', error)
  const t = await getTranslations('cms.errors')
  return t('generic')
}

function revalidatePublicService(slug: string) {
  revalidatePath('/services')
  revalidatePath(`/services/${slug}`)
  revalidatePath('/')
}

function formInput(formData: FormData) {
  return validateServiceInput({
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    summary: String(formData.get('summary') ?? ''),
    description: String(formData.get('description') ?? ''),
    category: String(formData.get('category') ?? ''),
    responsibleOffice: String(formData.get('responsibleOffice') ?? ''),
    eligibility: String(formData.get('eligibility') ?? ''),
    requiredDocuments: String(formData.get('requiredDocuments') ?? ''),
    process: String(formData.get('process') ?? ''),
    contact: String(formData.get('contact') ?? ''),
    icon: String(formData.get('icon') ?? 'file'),
    status: String(formData.get('status') ?? 'draft'),
  })
}

export async function createServiceAction(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  let serviceId: string
  let slug = ''
  try {
    const input = formInput(formData)
    const institutionId = await getActiveInstitutionId()
    input.status = enforcePublishingGate(getSessionRole(access.session), input.status)
    const item = await createService(institutionId, input)
    serviceId = item.id
    slug = item.slug
  } catch (error) {
    return { error: await mapServiceError(error) }
  }

  revalidatePath('/cms/services')
  if (slug) {
    revalidatePublicService(slug)
  }
  redirect(`/cms/services/${serviceId}?created=1`)
}

export async function updateServiceAction(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    return { error: 'Missing service id.' }
  }

  let previousSlug = ''
  let nextSlug = ''
  let previousStatus: string | null = null
  let nextStatus = 'draft'
  try {
    const input = formInput(formData)
    const institutionId = await getActiveInstitutionId()
    const existing = await getServiceById(institutionId, id)
    input.status = enforcePublishingGate(
      getSessionRole(access.session),
      input.status,
      existing.status,
    )
    previousSlug = existing?.slug ?? ''
    previousStatus = existing?.status ?? null
    await updateService(institutionId, id, input)
    nextSlug = input.slug
    nextStatus = input.status
  } catch (error) {
    return { error: await mapServiceError(error) }
  }

  revalidatePath('/cms/services')
  revalidatePath(`/cms/services/${id}`)
  if (nextSlug) {
    revalidatePublicService(nextSlug)
  }
  if (previousSlug && previousSlug !== nextSlug) {
    revalidatePublicService(previousSlug)
  }
  return { success: await cmsSaveSuccessMessage(nextStatus, previousStatus) }
}

export async function archiveServiceAction(formData: FormData): Promise<void> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    redirect(`/cms/services?error=${encodeURIComponent(access.error)}`)
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    redirect('/cms/services?error=Missing%20service%20id.')
  }

  let slug = ''
  try {
    const institutionId = await getActiveInstitutionId()
    const archived = await archiveService(institutionId, id)
    slug = archived?.slug ?? ''
  } catch (error) {
    redirect(`/cms/services?error=${encodeURIComponent(await mapServiceError(error))}`)
  }

  revalidatePath('/cms/services')
  if (slug) {
    revalidatePublicService(slug)
  }
  redirect('/cms/services?archived=1')
}

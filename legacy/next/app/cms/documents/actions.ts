'use server'

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canModifyContent, enforcePublishingGate, getAuthSession, getSessionRole, type AuthSession } from '@/lib/authz'
import { getActiveInstitutionId, InstitutionConfigError } from '@/lib/content/institution'
import {
  DocumentConflictError,
  DocumentNotFoundError,
  DocumentValidationError,
  archiveDocument,
  createDocument,
  getDocumentById,
  updateDocument,
  validateDocumentInput,
} from '@/lib/content/documents'
import { cmsSaveSuccessMessage } from '@/lib/cms/workflow-messages'

export type DocumentActionState = {
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

async function mapDocumentError(error: unknown): Promise<string> {
  if (
    error instanceof DocumentValidationError ||
    error instanceof DocumentConflictError ||
    error instanceof DocumentNotFoundError ||
    error instanceof InstitutionConfigError
  ) {
    return error.message
  }
  console.error('Documents CMS error:', error)
  const t = await getTranslations('cms.errors')
  return t('generic')
}

function revalidatePublicDocument(slug: string) {
  revalidatePath('/resources')
  revalidatePath(`/resources/${slug}`)
  revalidatePath('/')
}

function formInput(formData: FormData) {
  return validateDocumentInput({
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    summary: String(formData.get('summary') ?? ''),
    category: String(formData.get('category') ?? ''),
    year: String(formData.get('year') ?? ''),
    fileUrl: String(formData.get('fileUrl') ?? ''),
    fileType: String(formData.get('fileType') ?? ''),
    fileSize: String(formData.get('fileSize') ?? ''),
    status: String(formData.get('status') ?? 'draft'),
  })
}

export async function createDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  let documentId: string
  let slug = ''
  try {
    const input = formInput(formData)
    const institutionId = await getActiveInstitutionId()
    input.status = enforcePublishingGate(getSessionRole(access.session), input.status)
    const item = await createDocument(institutionId, input)
    documentId = item.id
    slug = item.slug
  } catch (error) {
    return { error: await mapDocumentError(error) }
  }

  revalidatePath('/cms/documents')
  if (slug) {
    revalidatePublicDocument(slug)
  }
  redirect(`/cms/documents/${documentId}?created=1`)
}

export async function updateDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    return { error: 'Missing document id.' }
  }

  let previousSlug = ''
  let nextSlug = ''
  let previousStatus: string | null = null
  let nextStatus = 'draft'
  try {
    const input = formInput(formData)
    const institutionId = await getActiveInstitutionId()
    const existing = await getDocumentById(institutionId, id)
    input.status = enforcePublishingGate(
      getSessionRole(access.session),
      input.status,
      existing.status,
    )
    previousSlug = existing?.slug ?? ''
    previousStatus = existing?.status ?? null
    await updateDocument(institutionId, id, input)
    nextSlug = input.slug
    nextStatus = input.status
  } catch (error) {
    return { error: await mapDocumentError(error) }
  }

  revalidatePath('/cms/documents')
  revalidatePath(`/cms/documents/${id}`)
  if (nextSlug) {
    revalidatePublicDocument(nextSlug)
  }
  if (previousSlug && previousSlug !== nextSlug) {
    revalidatePublicDocument(previousSlug)
  }
  return { success: await cmsSaveSuccessMessage(nextStatus, previousStatus) }
}

export async function archiveDocumentAction(formData: FormData): Promise<void> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    redirect(`/cms/documents?error=${encodeURIComponent(access.error)}`)
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    redirect('/cms/documents?error=Missing%20document%20id.')
  }

  let slug = ''
  try {
    const institutionId = await getActiveInstitutionId()
    const archived = await archiveDocument(institutionId, id)
    slug = archived?.slug ?? ''
  } catch (error) {
    redirect(`/cms/documents?error=${encodeURIComponent(await mapDocumentError(error))}`)
  }

  revalidatePath('/cms/documents')
  if (slug) {
    revalidatePublicDocument(slug)
  }
  redirect('/cms/documents?archived=1')
}

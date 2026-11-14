'use server'

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canModifyContent, enforcePublishingGate, getAuthSession, getSessionRole, type AuthSession } from '@/lib/authz'
import { getActiveInstitutionId, InstitutionConfigError } from '@/lib/content/institution'
import {
  PageConflictError,
  PageNotFoundError,
  PageValidationError,
  archivePage,
  createPage,
  getPageById,
  updatePage,
  validatePageInput,
} from '@/lib/content/pages'
import {
  TRANSLATION_LANGUAGES,
  type PageTranslations,
} from '@/lib/content/page-translations'
import { cmsSaveSuccessMessage } from '@/lib/cms/workflow-messages'

function translationsFromForm(formData: FormData): PageTranslations {
  const translations: PageTranslations = {}
  for (const language of TRANSLATION_LANGUAGES) {
    const code = language.code
    const title = String(formData.get(`translation_${code}_title`) ?? '')
    const content = String(formData.get(`translation_${code}_content`) ?? '')
    translations[code] = { title, content }
  }
  return translations
}

export type PageActionState = {
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

async function mapPageError(error: unknown): Promise<string> {
  if (
    error instanceof PageValidationError ||
    error instanceof PageConflictError ||
    error instanceof PageNotFoundError ||
    error instanceof InstitutionConfigError
  ) {
    return error.message
  }
  console.error('Pages CMS error:', error)
  const t = await getTranslations('cms.errors')
  return t('generic')
}

function revalidatePublicPage(slug: string) {
  revalidatePath(`/${slug}`)
}

export async function createPageAction(
  _prev: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  let pageId: string
  let slug = ''
  try {
    const input = validatePageInput({
      title: String(formData.get('title') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      content: String(formData.get('content') ?? ''),
      status: String(formData.get('status') ?? 'draft'),
      translations: translationsFromForm(formData),
    })

    const institutionId = await getActiveInstitutionId()
    input.status = enforcePublishingGate(getSessionRole(access.session), input.status)
    const page = await createPage(institutionId, input)
    pageId = page.id
    slug = page.slug
  } catch (error) {
    return { error: await mapPageError(error) }
  }

  revalidatePath('/cms/content')
  if (slug) {
    revalidatePublicPage(slug)
  }
  redirect(`/cms/content/${pageId}?created=1`)
}

export async function updatePageAction(
  _prev: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    return { error: 'Missing page id.' }
  }

  let previousSlug = ''
  let nextSlug = ''
  try {
    const input = validatePageInput({
      title: String(formData.get('title') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      content: String(formData.get('content') ?? ''),
      status: String(formData.get('status') ?? 'draft'),
      translations: translationsFromForm(formData),
    })

    const institutionId = await getActiveInstitutionId()
    const existing = await getPageById(institutionId, id)
    input.status = enforcePublishingGate(
      getSessionRole(access.session),
      input.status,
      existing.status,
    )
    previousSlug = existing?.slug ?? ''
    const previousStatus = existing?.status ?? null
    await updatePage(institutionId, id, input)
    nextSlug = input.slug

    revalidatePath('/cms/content')
    revalidatePath(`/cms/content/${id}`)
    if (nextSlug) {
      revalidatePublicPage(nextSlug)
    }
    // Old public URL must stop serving after a slug change.
    if (previousSlug && previousSlug !== nextSlug) {
      revalidatePublicPage(previousSlug)
    }
    return { success: await cmsSaveSuccessMessage(input.status, previousStatus) }
  } catch (error) {
    return { error: await mapPageError(error) }
  }
}

export async function archivePageAction(formData: FormData): Promise<void> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    redirect(`/cms/content?error=${encodeURIComponent(access.error)}`)
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    redirect('/cms/content?error=Missing%20page%20id.')
  }

  let slug = ''
  try {
    const institutionId = await getActiveInstitutionId()
    const archived = await archivePage(institutionId, id)
    slug = archived?.slug ?? ''
  } catch (error) {
    redirect(`/cms/content?error=${encodeURIComponent(await mapPageError(error))}`)
  }

  revalidatePath('/cms/content')
  if (slug) {
    revalidatePublicPage(slug)
  }
  redirect('/cms/content?archived=1')
}

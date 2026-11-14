'use server'

import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canModifyContent, enforcePublishingGate, getAuthSession, getSessionRole, type AuthSession } from '@/lib/authz'
import { getActiveInstitutionId, InstitutionConfigError } from '@/lib/content/institution'
import {
  NewsConflictError,
  NewsNotFoundError,
  NewsValidationError,
  archiveNews,
  createNews,
  getNewsById,
  updateNews,
  validateNewsInput,
} from '@/lib/content/news'
import { cmsSaveSuccessMessage } from '@/lib/cms/workflow-messages'

export type NewsActionState = {
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

async function mapNewsError(error: unknown): Promise<string> {
  if (
    error instanceof NewsValidationError ||
    error instanceof NewsConflictError ||
    error instanceof NewsNotFoundError ||
    error instanceof InstitutionConfigError
  ) {
    return error.message
  }
  console.error('News CMS error:', error)
  const t = await getTranslations('cms.errors')
  return t('generic')
}

export async function createNewsAction(
  _prev: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  let newsId: string
  let slug = ''
  try {
    const input = validateNewsInput({
      title: String(formData.get('title') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      summary: String(formData.get('summary') ?? ''),
      category: String(formData.get('category') ?? ''),
      content: String(formData.get('content') ?? ''),
      status: String(formData.get('status') ?? 'draft'),
    })

    const institutionId = await getActiveInstitutionId()
    input.status = enforcePublishingGate(getSessionRole(access.session), input.status)
    const item = await createNews(institutionId, input)
    newsId = item.id
    slug = item.slug
  } catch (error) {
    return { error: await mapNewsError(error) }
  }

  revalidatePath('/cms/news')
  revalidatePath('/news')
  revalidatePath('/')
  if (slug) {
    revalidatePath(`/news/${slug}`)
  }
  redirect(`/cms/news/${newsId}?created=1`)
}

export async function updateNewsAction(
  _prev: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    return { error: access.error }
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    return { error: 'Missing news id.' }
  }

  let slug = ''
  let previousStatus: string | null = null
  let nextStatus = 'draft'
  try {
    const input = validateNewsInput({
      title: String(formData.get('title') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      summary: String(formData.get('summary') ?? ''),
      category: String(formData.get('category') ?? ''),
      content: String(formData.get('content') ?? ''),
      status: String(formData.get('status') ?? 'draft'),
    })

    const institutionId = await getActiveInstitutionId()
    const existing = await getNewsById(institutionId, id)
    input.status = enforcePublishingGate(
      getSessionRole(access.session),
      input.status,
      existing.status,
    )
    previousStatus = existing?.status ?? null
    await updateNews(institutionId, id, input)
    slug = input.slug
    nextStatus = input.status
  } catch (error) {
    return { error: await mapNewsError(error) }
  }

  revalidatePath('/cms/news')
  revalidatePath(`/cms/news/${id}`)
  revalidatePath('/news')
  revalidatePath('/')
  if (slug) {
    revalidatePath(`/news/${slug}`)
  }
  return { success: await cmsSaveSuccessMessage(nextStatus, previousStatus) }
}

export async function archiveNewsAction(formData: FormData): Promise<void> {
  const access = await requireEditorSession()
  if (!('session' in access)) {
    redirect(`/cms/news?error=${encodeURIComponent(access.error)}`)
  }

  const id = String(formData.get('id') ?? '')
  if (!id) {
    redirect('/cms/news?error=Missing%20news%20id.')
  }

  let slug = ''
  try {
    const institutionId = await getActiveInstitutionId()
    const archived = await archiveNews(institutionId, id)
    slug = archived?.slug ?? ''
  } catch (error) {
    redirect(`/cms/news?error=${encodeURIComponent(await mapNewsError(error))}`)
  }

  revalidatePath('/cms/news')
  revalidatePath('/news')
  revalidatePath('/')
  if (slug) {
    revalidatePath(`/news/${slug}`)
  }
  redirect('/cms/news?archived=1')
}

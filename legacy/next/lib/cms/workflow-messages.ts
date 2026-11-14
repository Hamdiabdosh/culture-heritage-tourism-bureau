import { getTranslations } from 'next-intl/server'

/**
 * CMS save/archive feedback — status-aware, no new DB fields.
 * previousStatus is null for create.
 */
export type CmsContentStatus = 'draft' | 'published' | 'archived'

export async function cmsSaveSuccessMessage(
  nextStatus: string,
  previousStatus: string | null | undefined,
): Promise<string> {
  const t = await getTranslations('cms.workflow')
  const next = nextStatus as CmsContentStatus
  const prev = previousStatus as CmsContentStatus | null | undefined

  if (prev == null) {
    if (next === 'published') return t('publishedLive')
    if (next === 'archived') return t('archivedGone')
    return t('savedDraft')
  }

  if (prev === 'published' && next === 'draft') return t('savedDraftUnpublished')
  if (prev === 'published' && next === 'published') return t('changesLive')
  if (next === 'published') return t('publishedLive')
  if (next === 'archived') return t('archivedGone')

  return t('savedDraft')
}

export async function cmsArchivedSuccessMessage(): Promise<string> {
  const t = await getTranslations('cms.workflow')
  return t('archivedGone')
}

/** Banner after create redirect (?created=1) — based on the saved record status. */
export async function cmsCreatedBannerMessage(status: string): Promise<string> {
  return cmsSaveSuccessMessage(status, null)
}

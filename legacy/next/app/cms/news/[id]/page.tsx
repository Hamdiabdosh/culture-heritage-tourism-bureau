import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import {
  canModifyContent,
  getSessionRole,
  requireSession,
} from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { getNewsById } from '@/lib/content/news'
import { toIntlLocale } from '@/lib/content/public-format'
import {
  ArchiveNewsButton,
  NewsEditorForm,
  NewsViewer,
} from '@/components/cms-news-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'
import { cmsCreatedBannerMessage } from '@/lib/cms/workflow-messages'

export default async function CmsNewsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const session = await requireSession('/cms/news')
  const canEdit = canModifyContent(getSessionRole(session))
  const { id } = await params
  const query = await searchParams
  const t = await getTranslations('cms.news')
  const tCommon = await getTranslations('cms.common')
  const locale = await getLocale()
  const intlLocale = toIntlLocale(locale)

  function formatDate(value: Date) {
    return new Intl.DateTimeFormat(intlLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)
  }

  let institutionId: string
  try {
    institutionId = await getActiveInstitutionId()
  } catch (error) {
    if (error instanceof InstitutionConfigError) {
      return <CmsInstitutionConfigError message={error.message} />
    }
    throw error
  }

  const item = await getNewsById(institutionId, id)
  if (!item) {
    notFound()
  }

  const isPublished = item.status === 'published'
  const createdBanner = query.created
    ? await cmsCreatedBannerMessage(item.status)
    : null

  return (
    <main className="cms-pages">
      <div className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('listTitle')}</span>
          <h1>{canEdit ? t('editTitle') : t('viewTitle')}</h1>
          <p>
            {canEdit ? tCommon('editing') : tCommon('viewing')}{' '}
            <strong>{item.title}</strong>
          </p>
        </div>
        <div className="cms-pages-header-actions">
          <Link href="/cms/news">{t('backToNews')}</Link>
          {isPublished ? (
            <Link
              className="cms-secondary"
              href={`/news/${item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tCommon('viewOnWebsite')}
            </Link>
          ) : null}
          {canEdit ? null : (
            <span className="cms-readonly-badge">{tCommon('viewerReadonly')}</span>
          )}
        </div>
      </div>

      {createdBanner ? <p className="cms-form-success">{createdBanner}</p> : null}

      <section className="cms-panel cms-page-editor">
        {canEdit ? (
          <NewsEditorForm
            mode="edit"
            initial={{
              id: item.id,
              title: item.title,
              slug: item.slug,
              summary: item.summary ?? '',
              category: item.category ?? '',
              content: item.content ?? '',
              status: item.status,
            }}
          />
        ) : (
          <NewsViewer
            title={item.title}
            slug={item.slug}
            summary={item.summary ?? ''}
            category={item.category ?? ''}
            content={item.content ?? ''}
            status={item.status}
            updatedAtLabel={formatDate(item.updatedAt)}
          />
        )}
      </section>

      {canEdit ? (
        <section className="cms-panel cms-danger-zone">
          <h2 className="cms-form-section-title">{tCommon('archive')}</h2>
          <p className="cms-muted">{t('archiveHelp')}</p>
          <ArchiveNewsButton id={item.id} />
        </section>
      ) : null}
    </main>
  )
}

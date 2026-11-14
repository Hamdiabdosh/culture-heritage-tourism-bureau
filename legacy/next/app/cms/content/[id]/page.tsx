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
import { getPageById } from '@/lib/content/pages'
import { toIntlLocale } from '@/lib/content/public-format'
import { ArchivePageButton, PageEditorForm, PageViewer } from '@/components/cms-page-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'
import { cmsCreatedBannerMessage } from '@/lib/cms/workflow-messages'

export default async function CmsPageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const session = await requireSession('/cms/content')
  const canEdit = canModifyContent(getSessionRole(session))
  const { id } = await params
  const query = await searchParams
  const t = await getTranslations('cms.pages')
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

  const page = await getPageById(institutionId, id)
  if (!page) {
    notFound()
  }

  const isPublished = page.status === 'published'
  const createdBanner = query.created
    ? await cmsCreatedBannerMessage(page.status)
    : null

  return (
    <main className="cms-pages">
      <div className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('listTitle')}</span>
          <h1>{canEdit ? t('editTitle') : t('viewTitle')}</h1>
          <p>
            {canEdit ? tCommon('editing') : tCommon('viewing')}{' '}
            <strong>{page.title}</strong>
          </p>
        </div>
        <div className="cms-pages-header-actions">
          <Link href="/cms/content">{t('backToPages')}</Link>
          {isPublished ? (
            <Link
              className="cms-secondary"
              href={`/${page.slug}`}
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
          <PageEditorForm
            mode="edit"
            initial={{
              id: page.id,
              title: page.title,
              slug: page.slug,
              content: page.content ?? '',
              status: page.status,
              translations: page.translations ?? {},
            }}
          />
        ) : (
          <PageViewer
            title={page.title}
            slug={page.slug}
            content={page.content ?? ''}
            status={page.status}
            translations={page.translations ?? {}}
            updatedAtLabel={formatDate(page.updatedAt)}
          />
        )}
      </section>

      {canEdit ? (
        <section className="cms-panel cms-danger-zone">
          <h2 className="cms-form-section-title">{tCommon('archive')}</h2>
          <p className="cms-muted">{t('archiveHelp')}</p>
          <ArchivePageButton id={page.id} />
        </section>
      ) : null}
    </main>
  )
}

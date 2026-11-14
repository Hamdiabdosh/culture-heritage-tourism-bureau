import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import {
  canModifyContent,
  getSessionRole,
  requireSession,
} from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { formatDocumentMeta, getDocumentById } from '@/lib/content/documents'
import {
  ArchiveDocumentButton,
  DocumentEditorForm,
  DocumentViewer,
} from '@/components/cms-document-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'
import { cmsCreatedBannerMessage } from '@/lib/cms/workflow-messages'

export default async function CmsDocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const session = await requireSession('/cms/documents')
  const canEdit = canModifyContent(getSessionRole(session))
  const { id } = await params
  const query = await searchParams
  const t = await getTranslations('cms.documents')
  const tCommon = await getTranslations('cms.common')

  let institutionId: string
  try {
    institutionId = await getActiveInstitutionId()
  } catch (error) {
    if (error instanceof InstitutionConfigError) {
      return <CmsInstitutionConfigError message={error.message} />
    }
    throw error
  }

  const item = await getDocumentById(institutionId, id)
  if (!item) {
    notFound()
  }

  const meta = formatDocumentMeta(item)
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
          <Link href="/cms/documents">{t('backToDocuments')}</Link>
          {isPublished ? (
            <Link
              className="cms-secondary"
              href={`/resources/${item.slug}`}
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
          <DocumentEditorForm
            mode="edit"
            initial={{
              id: item.id,
              title: item.title,
              slug: item.slug,
              summary: item.summary ?? '',
              category: item.category ?? '',
              year: item.year ?? '',
              fileUrl: item.fileUrl ?? '',
              fileType: item.fileType ?? '',
              fileSize: item.fileSize ?? '',
              status: item.status,
            }}
          />
        ) : (
          <DocumentViewer
            title={item.title}
            slug={item.slug}
            summary={item.summary ?? ''}
            category={item.category ?? ''}
            year={item.year ?? ''}
            fileUrl={item.fileUrl ?? ''}
            fileMeta={meta || ''}
            status={item.status}
          />
        )}
      </section>

      {canEdit ? (
        <section className="cms-panel cms-danger-zone">
          <h2 className="cms-form-section-title">{tCommon('archive')}</h2>
          <p className="cms-muted">{t('archiveHelp')}</p>
          <ArchiveDocumentButton id={item.id} />
        </section>
      ) : null}
    </main>
  )
}

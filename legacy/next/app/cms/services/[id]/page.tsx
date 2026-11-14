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
import { getServiceById, type ServiceIcon } from '@/lib/content/services'
import { toIntlLocale } from '@/lib/content/public-format'
import {
  ArchiveServiceButton,
  ServiceEditorForm,
  ServiceViewer,
} from '@/components/cms-service-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'
import { cmsCreatedBannerMessage } from '@/lib/cms/workflow-messages'

export default async function CmsServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const session = await requireSession('/cms/services')
  const canEdit = canModifyContent(getSessionRole(session))
  const { id } = await params
  const query = await searchParams
  const t = await getTranslations('cms.services')
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

  const item = await getServiceById(institutionId, id)
  if (!item) {
    notFound()
  }

  const icon = (item.icon as ServiceIcon) || 'file'
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
          <Link href="/cms/services">{t('backToServices')}</Link>
          {isPublished ? (
            <Link
              className="cms-secondary"
              href={`/services/${item.slug}`}
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
          <ServiceEditorForm
            mode="edit"
            initial={{
              id: item.id,
              title: item.title,
              slug: item.slug,
              summary: item.summary ?? '',
              description: item.description ?? '',
              category: item.category ?? '',
              responsibleOffice: item.responsibleOffice ?? '',
              eligibility: item.eligibility ?? '',
              requiredDocuments: (item.requiredDocuments ?? []).join('\n'),
              process: (item.process ?? []).join('\n'),
              contact: item.contact ?? '',
              icon,
              status: item.status,
            }}
          />
        ) : (
          <ServiceViewer
            title={item.title}
            slug={item.slug}
            summary={item.summary ?? ''}
            description={item.description ?? ''}
            category={item.category ?? ''}
            responsibleOffice={item.responsibleOffice ?? ''}
            eligibility={item.eligibility ?? ''}
            contact={item.contact ?? ''}
            icon={icon}
            requiredDocuments={(item.requiredDocuments ?? []).join('\n')}
            process={(item.process ?? []).join('\n')}
            status={item.status}
            updatedAtLabel={formatDate(item.updatedAt)}
          />
        )}
      </section>

      {canEdit ? (
        <section className="cms-panel cms-danger-zone">
          <h2 className="cms-form-section-title">{tCommon('archive')}</h2>
          <p className="cms-muted">{t('archiveHelp')}</p>
          <ArchiveServiceButton id={item.id} />
        </section>
      ) : null}
    </main>
  )
}

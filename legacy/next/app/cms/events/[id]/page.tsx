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
import {
  formatEventDateParts,
  getEventById,
  toDatetimeLocalValue,
} from '@/lib/content/events'
import {
  ArchiveEventButton,
  EventEditorForm,
  EventViewer,
} from '@/components/cms-event-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'
import { cmsCreatedBannerMessage } from '@/lib/cms/workflow-messages'

export default async function CmsEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const session = await requireSession('/cms/events')
  const canEdit = canModifyContent(getSessionRole(session))
  const { id } = await params
  const query = await searchParams
  const t = await getTranslations('cms.events')
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

  const item = await getEventById(institutionId, id)
  if (!item) {
    notFound()
  }

  const dateParts = formatEventDateParts(item.eventDate)
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
          <Link href="/cms/events">{t('backToEvents')}</Link>
          {isPublished ? (
            <Link
              className="cms-secondary"
              href={`/events/${item.slug}`}
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
          <EventEditorForm
            mode="edit"
            initial={{
              id: item.id,
              title: item.title,
              slug: item.slug,
              summary: item.summary ?? '',
              content: item.content ?? '',
              eventDate: toDatetimeLocalValue(item.eventDate),
              location: item.location ?? '',
              type: item.type ?? '',
              status: item.status,
            }}
          />
        ) : (
          <EventViewer
            title={item.title}
            slug={item.slug}
            summary={item.summary ?? ''}
            content={item.content ?? ''}
            eventDateLabel={dateParts.label}
            type={item.type ?? ''}
            location={item.location ?? ''}
            status={item.status}
          />
        )}
      </section>

      {canEdit ? (
        <section className="cms-panel cms-danger-zone">
          <h2 className="cms-form-section-title">{tCommon('archive')}</h2>
          <p className="cms-muted">{t('archiveHelp')}</p>
          <ArchiveEventButton id={item.id} />
        </section>
      ) : null}
    </main>
  )
}

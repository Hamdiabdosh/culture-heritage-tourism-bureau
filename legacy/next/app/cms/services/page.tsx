import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireSession, getSessionRole, canModifyContent } from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { listServices } from '@/lib/content/services'
import { toIntlLocale } from '@/lib/content/public-format'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'

export default async function CmsServicesListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; archived?: string }>
}) {
  const session = await requireSession('/cms/services')
  const role = getSessionRole(session)
  const canEdit = canModifyContent(role)
  const params = await searchParams
  const t = await getTranslations('cms.services')
  const tCommon = await getTranslations('cms.common')
  const tNav = await getTranslations('cms.navigation')
  const tStatus = await getTranslations('cms.status')
  const tWorkflow = await getTranslations('cms.workflow')
  const locale = await getLocale()
  const intlLocale = toIntlLocale(locale)

  function formatDate(value: Date) {
    return new Intl.DateTimeFormat(intlLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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

  const items = await listServices(institutionId)

  return (
    <main className="cms-pages">
      <div className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tNav('content')}</span>
          <h1>{t('listTitle')}</h1>
          <p>{t('listIntro')}</p>
        </div>
        <div className="cms-pages-header-actions">
          <Link href="/cms">{tCommon('backOverview')}</Link>
          {canEdit ? (
            <Link className="cms-primary" href="/cms/services/new">
              {t('newService')}
            </Link>
          ) : (
            <span className="cms-readonly-badge">{tCommon('viewerReadonly')}</span>
          )}
        </div>
      </div>

      {params.error ? <p className="cms-form-error">{params.error}</p> : null}
      {params.archived ? (
        <p className="cms-form-success">{tWorkflow('archivedGone')}</p>
      ) : null}

      <section className="cms-panel cms-pages-table-wrap">
        {items.length === 0 ? (
          <div className="cms-empty">
            <h2>{t('emptyTitle')}</h2>
            <p>{canEdit ? t('emptyEditor') : t('emptyViewer')}</p>
            {canEdit ? (
              <Link className="cms-primary" href="/cms/services/new">
                {t('createService')}
              </Link>
            ) : null}
          </div>
        ) : (
          <table className="cms-table">
            <thead>
              <tr>
                <th>{tCommon('title')}</th>
                <th>{tCommon('status')}</th>
                <th>{tCommon('updated')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link className="cms-row-title" href={`/cms/services/${item.id}`}>
                      <strong>{item.title}</strong>
                      <small>/{item.slug}</small>
                      {item.category?.trim() ? (
                        <small className="cms-row-meta">{item.category}</small>
                      ) : null}
                    </Link>
                  </td>
                  <td>
                    <span className={`cms-status-pill ${item.status}`}>
                      {tStatus(item.status as 'draft' | 'published' | 'archived')}
                    </span>
                  </td>
                  <td>{formatDate(item.updatedAt)}</td>
                  <td>
                    <Link className="cms-row-action" href={`/cms/services/${item.id}`}>
                      {canEdit ? tCommon('edit') : tCommon('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

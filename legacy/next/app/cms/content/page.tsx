import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireSession, getSessionRole, canModifyContent } from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { listPages } from '@/lib/content/pages'
import { getPageTranslationCoverage } from '@/lib/content/page-translations'
import { toIntlLocale } from '@/lib/content/public-format'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'

export default async function CmsPagesListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; archived?: string }>
}) {
  const session = await requireSession('/cms/content')
  const role = getSessionRole(session)
  const canEdit = canModifyContent(role)
  const params = await searchParams
  const t = await getTranslations('cms.pages')
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

  const pages = await listPages(institutionId)

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
            <Link className="cms-primary" href="/cms/content/new">
              {t('newPage')}
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
        {pages.length === 0 ? (
          <div className="cms-empty">
            <h2>{t('emptyTitle')}</h2>
            <p>{canEdit ? t('emptyEditor') : t('emptyViewer')}</p>
            {canEdit ? (
              <Link className="cms-primary" href="/cms/content/new">
                {t('createPage')}
              </Link>
            ) : null}
          </div>
        ) : (
          <table className="cms-table">
            <thead>
              <tr>
                <th>{tCommon('title')}</th>
                <th>{tCommon('translations')}</th>
                <th>{tCommon('status')}</th>
                <th>{tCommon('updated')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const coverage = getPageTranslationCoverage({
                  title: page.title,
                  translations: page.translations,
                })
                return (
                  <tr key={page.id}>
                    <td>
                      <Link className="cms-row-title" href={`/cms/content/${page.id}`}>
                        <strong>{page.title}</strong>
                        <small>/{page.slug}</small>
                      </Link>
                    </td>
                    <td>
                      <div
                        className="cms-lang-coverage"
                        title={t('translationsCoverage', {
                          done: coverage.ready,
                          total: coverage.total,
                        })}
                      >
                        <span className="cms-lang-coverage-count">
                          {coverage.ready} / {coverage.total}
                        </span>
                        <span className="cms-lang-coverage-marks" aria-hidden="true">
                          {coverage.languages.map((language) => (
                            <span
                              key={language.code}
                              className={
                                language.present
                                  ? 'cms-lang-mark is-ready'
                                  : 'cms-lang-mark is-missing'
                              }
                            >
                              {language.short} {language.present ? '✓' : '—'}
                            </span>
                          ))}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`cms-status-pill ${page.status}`}>
                        {tStatus(page.status as 'draft' | 'published' | 'archived')}
                      </span>
                    </td>
                    <td>{formatDate(page.updatedAt)}</td>
                    <td>
                      <Link className="cms-row-action" href={`/cms/content/${page.id}`}>
                        {canEdit ? tCommon('edit') : tCommon('view')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

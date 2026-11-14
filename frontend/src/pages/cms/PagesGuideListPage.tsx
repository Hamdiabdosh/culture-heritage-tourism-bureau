import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { pagesApi, type CmsPage } from '../../lib/api-client'
import { GUIDE_SLOTS } from '../../lib/guide-pages'
import { useT } from '../../lib/i18n'
import { siteTemplate } from '../../lib/site-template'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'

export function CmsPagesGuideListPage() {
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.pages')
  const tCommon = useT('cms.common')
  const tDash = useT('cms.dashboard')
  const tStatus = useT('cms.status')
  const [items, setItems] = useState<CmsPage[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setItems(null)
    setError(null)
    pagesApi
      .cmsList()
      .then(setItems)
      .catch((err: Error) => {
        setItems([])
        setError(err.message)
      })
  }

  useEffect(() => {
    load()
  }, [])

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(formatDocumentTitle(t('listTitle'), officeName))

  const bySlug = new Map((items ?? []).map((p) => [p.slug, p]))
  const loading = items === null && !error

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tDash('contentKicker')}</span>
          <h1>{t('listTitle')}</h1>
          <p>{t('listIntro')}</p>
        </div>
      </header>

      {error ? (
        <div className="cms-empty cms-panel" role="alert">
          <h2>{tCommon('loadError')}</h2>
          <p>{error}</p>
          <button type="button" className="cms-primary" onClick={load}>
            {tCommon('tryAgain')}
          </button>
        </div>
      ) : null}

      {loading ? <p className="cms-muted">{tCommon('loading')}</p> : null}

      {!loading && !error ? (
        <div className="cms-panel cms-pages-table-wrap">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>{t('slotColumn')}</th>
                  <th>{tCommon('title')}</th>
                  <th>{tCommon('publicUrl')}</th>
                  <th>{tCommon('status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {GUIDE_SLOTS.map((slot) => {
                  const page = bySlug.get(slot.slug)
                  const editTo = slot.editPath ?? (page ? `/cms/content/${page.id}` : null)
                  return (
                    <tr key={slot.slug}>
                      <td>
                        <strong>{t(slot.labelKey)}</strong>
                        <p className="cms-muted" style={{ margin: '4px 0 0', fontSize: '0.85em' }}>
                          {t(slot.hintKey)}
                        </p>
                      </td>
                      <td>{page?.title ?? t('slotMissing')}</td>
                      <td>
                        <a href={slot.publicPath} target="_blank" rel="noreferrer">
                          <code>{slot.publicPath}</code>
                        </a>
                      </td>
                      <td>
                        {page ? (
                          <span className={`cms-status-pill ${page.status}`}>
                            {tStatus(page.status)}
                          </span>
                        ) : (
                          <span className="cms-muted">{t('slotMissing')}</span>
                        )}
                      </td>
                      <td>
                        {editTo ? (
                          <Link className="cms-row-action" to={editTo}>
                            {canWrite ? tCommon('edit') : tCommon('view')}
                          </Link>
                        ) : (
                          <span className="cms-muted">{t('slotMissingHelp')}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="cms-muted" style={{ marginTop: 16 }}>
            {t('fixedSlotsNote')}
          </p>
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { newsApi, type CmsNews } from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'
import { siteTemplate } from '../../lib/site-template'

export function CmsNewsListPage() {
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.news')
  const tCommon = useT('cms.common')
  const tDash = useT('cms.dashboard')
  const tStatus = useT('cms.status')
  const [items, setItems] = useState<CmsNews[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setItems(null)
    setError(null)
    newsApi
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

  const loading = items === null && !error
  const empty = items !== null && items.length === 0 && !error

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tDash('contentKicker')}</span>
          <h1>{t('listTitle')}</h1>
          <p>{items ? tCommon('itemsCount', { count: items.length }) : t('listIntro')}</p>
        </div>
        <div className="cms-pages-header-actions">
          {canWrite ? (
            <Link className="cms-primary" to="/cms/news/new">
              {t('newArticle')}
            </Link>
          ) : null}
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

      {empty ? (
        <div className="cms-empty cms-panel">
          <h2>{t('emptyTitle')}</h2>
          <p>{canWrite ? t('emptyEditor') : t('emptyViewer')}</p>
          {canWrite ? (
            <Link className="cms-primary" to="/cms/news/new">
              {t('newArticle')}
            </Link>
          ) : null}
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <div className="cms-panel cms-pages-table-wrap">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>{tCommon('title')}</th>
                  <th>{tCommon('slug')}</th>
                  <th>{tCommon('status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="cms-row-title" to={`/cms/news/${item.id}`}>
                        <strong>{item.title}</strong>
                      </Link>
                    </td>
                    <td>
                      <code>{item.slug}</code>
                    </td>
                    <td>
                      <span className={`cms-status-pill ${item.status}`}>
                        {tStatus(item.status)}
                      </span>
                    </td>
                    <td>
                      <Link className="cms-row-action" to={`/cms/news/${item.id}`}>
                        {canWrite ? tCommon('edit') : tCommon('view')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

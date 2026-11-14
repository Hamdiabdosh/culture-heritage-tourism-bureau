import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { ApiClientError, usersApi, type CmsUser, type SessionUser } from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'
import { siteTemplate } from '../../lib/site-template'

export function CmsUsersPage() {
  const { user, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.users')
  const tNav = useT('cms.navigation')
  const tCommon = useT('cms.common')
  const [items, setItems] = useState<CmsUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(formatDocumentTitle(t('title'), officeName))

  async function reload() {
    setItems(await usersApi.list())
  }

  useEffect(() => {
    if (user.role !== 'admin') return
    reload().catch((err: Error) => {
      setItems([])
      setError(err.message)
    })
  }, [user.role])

  if (user.role !== 'admin') {
    return (
      <div className="cms-pages">
        <p className="cms-form-error">{t('onlyAdmins')}</p>
        <Link to="/cms">{tCommon('backOverview')}</Link>
      </div>
    )
  }

  async function setRole(id: string, role: SessionUser['role']) {
    setBusy(id)
    setError(null)
    try {
      await usersApi.update(id, { role })
      await reload()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function setActive(id: string, active: boolean) {
    setBusy(id)
    setError(null)
    try {
      await usersApi.update(id, { active })
      await reload()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const loading = items === null && !error
  const empty = items !== null && items.length === 0 && !error

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tNav('administration')}</span>
          <h1>{t('title')}</h1>
          <p>
            {items
              ? t('accountsNote', { count: items.length })
              : t('intro')}
          </p>
        </div>
      </header>

      {error ? <p className="cms-form-error">{error}</p> : null}
      {loading ? <p className="cms-muted">{tCommon('loading')}</p> : null}

      {empty ? (
        <div className="cms-empty cms-panel">
          <h2>{t('emptyTitle')}</h2>
          <p>{t('emptyBody')}</p>
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <div className="cms-panel cms-pages-table-wrap">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>{tCommon('name')}</th>
                  <th>{tCommon('email')}</th>
                  <th>{tCommon('role')}</th>
                  <th>{t('active')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.email}</td>
                    <td>
                      <select
                        value={item.role}
                        disabled={busy === item.id}
                        aria-label={t('roleFor', { name: item.name })}
                        onChange={(e) => setRole(item.id, e.target.value as SessionUser['role'])}
                      >
                        <option value="admin">{tNav('roleAdmin')}</option>
                        <option value="editor">{tNav('roleEditor')}</option>
                        <option value="viewer">{tNav('roleViewer')}</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={item.active ? 'cms-danger' : 'cms-primary'}
                        disabled={busy === item.id}
                        onClick={() => setActive(item.id, !item.active)}
                      >
                        {item.active ? t('deactivate') : t('activate')}
                      </button>
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

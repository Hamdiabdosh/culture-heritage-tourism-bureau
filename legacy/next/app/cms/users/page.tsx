import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/authz'
import { APP_ROLES, listUsers } from '@/lib/cms/users'
import { toIntlLocale } from '@/lib/content/public-format'
import { updateUserActiveAction, updateUserRoleAction } from './actions'

const ROLE_NAV_KEY = {
  admin: 'roleAdmin',
  editor: 'roleEditor',
  viewer: 'roleViewer',
} as const

export default async function CmsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>
}) {
  await requireAdmin({ nextPath: '/cms/users' })
  const params = await searchParams
  const users = await listUsers()
  const t = await getTranslations('cms.users')
  const tCommon = await getTranslations('cms.common')
  const tNav = await getTranslations('cms.navigation')
  const tStatus = await getTranslations('cms.status')
  const locale = await getLocale()
  const intlLocale = toIntlLocale(locale)

  function formatDate(value: Date) {
    return new Intl.DateTimeFormat(intlLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value)
  }

  return (
    <main className="cms-pages">
      <div className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tNav('administration')}</span>
          <h1>{t('title')}</h1>
          <p>{t('intro')}</p>
        </div>
      </div>

      {params.error ? <p className="cms-form-error">{params.error}</p> : null}
      {params.updated ? <p className="cms-form-success">{params.updated}</p> : null}

      <section className="cms-panel cms-pages-table-wrap">
        {users.length === 0 ? (
          <div className="cms-empty">
            <h2>{t('emptyTitle')}</h2>
            <p>{t('emptyBody')}</p>
          </div>
        ) : (
          <table className="cms-table">
            <thead>
              <tr>
                <th>{tCommon('name')}</th>
                <th>{tCommon('email')}</th>
                <th>{tCommon('role')}</th>
                <th>{tCommon('status')}</th>
                <th>{tCommon('created')}</th>
                <th>{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <form action={updateUserRoleAction} className="cms-user-role-form">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        aria-label={t('roleFor', { name: user.name })}
                      >
                        {APP_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {tNav(ROLE_NAV_KEY[role])}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="cms-secondary">
                        {tCommon('update')}
                      </button>
                    </form>
                  </td>
                  <td>
                    <span
                      className={`cms-status-pill ${user.active ? 'published' : 'archived'}`}
                    >
                      {user.active ? tStatus('active') : tStatus('inactive')}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <form action={updateUserActiveAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={user.active ? 'false' : 'true'}
                      />
                      <button
                        type="submit"
                        className={user.active ? 'cms-danger' : 'cms-secondary'}
                      >
                        {user.active ? t('deactivate') : t('activate')}
                      </button>
                    </form>
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

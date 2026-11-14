import { Link, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { useT } from '../../lib/i18n'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'
import { siteTemplate } from '../../lib/site-template'

export function CmsDashboardPage() {
  const { user, institution, canWrite } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.dashboard')
  const tNav = useT('cms.navigation')
  const tCommon = useT('cms.common')
  const name = institution?.name ?? siteTemplate.fallbackInstitutionName

  useDocumentTitle(formatDocumentTitle(tNav('overview'), name))

  const areas = [
    { to: '/cms/content', label: tNav('pages'), hint: t('pagesDesc') },
    { to: '/cms/news', label: tNav('news'), hint: t('newsDesc') },
    { to: '/cms/services', label: tNav('services'), hint: t('servicesDesc') },
    { to: '/cms/events', label: tNav('events'), hint: t('eventsDesc') },
    { to: '/cms/documents', label: tNav('documents'), hint: t('documentsDesc') },
    { to: '/cms/settings', label: tNav('settings'), hint: t('settingsDesc') },
  ] as const

  const creates = [
    { to: '/cms/news/new', label: t('newArticle') },
    { to: '/cms/services/new', label: t('newService') },
    { to: '/cms/events/new', label: t('newEvent') },
    { to: '/cms/documents/new', label: t('newDocument') },
    { to: '/cms/content', label: t('editGuidePages') },
  ] as const

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tNav('workspace')}</span>
          <h1>{t('welcome', { name: user.name || t('there') })}</h1>
          <p>{canWrite ? t('manageIntro', { name }) : t('readonlyIntro', { name })}</p>
        </div>
        {!canWrite ? <span className="cms-readonly-badge">{t('viewerReadonly')}</span> : null}
      </header>

      <section className="cms-panel cms-content-areas">
        <div className="cms-panel-heading">
          <div>
            <span className="cms-kicker">{t('contentKicker')}</span>
            <h2>{t('whatYouCanManage')}</h2>
          </div>
        </div>
        <div className="cms-area-grid">
          {areas.map((item) => (
            <Link key={item.to} className="cms-area-card" to={item.to}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              <b>→</b>
            </Link>
          ))}
          {user.role === 'admin' ? (
            <Link className="cms-area-card" to="/cms/users">
              <span>
                <strong>{tNav('users')}</strong>
                <small>{tCommon('role')}</small>
              </span>
              <b>→</b>
            </Link>
          ) : null}
        </div>
      </section>

      {canWrite ? (
        <section className="cms-panel cms-create-panel">
          <div className="cms-panel-heading">
            <div>
              <span className="cms-kicker">{t('createKicker')}</span>
              <h2>{t('startSomethingNew')}</h2>
            </div>
          </div>
          <div className="cms-create-row">
            {creates.map((item) => (
              <Link key={item.to} className="cms-create-chip" to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="cms-panel cms-access-panel">
          <div className="cms-panel-heading">
            <div>
              <span className="cms-kicker">{t('accessKicker')}</span>
              <h2>{t('readonlyWorkspace')}</h2>
            </div>
          </div>
          <p className="cms-access-copy">{t('readonlyCopy')}</p>
          <div className="cms-access-links">
            <Link to="/cms/content">{t('viewPages')}</Link>
            <Link to="/cms/news">{t('viewNews')}</Link>
            <Link to="/">{t('openPublic')}</Link>
          </div>
        </section>
      )}
    </div>
  )
}

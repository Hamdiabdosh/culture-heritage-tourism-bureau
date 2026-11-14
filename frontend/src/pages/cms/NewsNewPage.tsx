import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { NewsEditorForm } from '../../components/cms/NewsEditorForm'
import { newsApi, type NewsInput } from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'
import { siteTemplate } from '../../lib/site-template'

const empty: NewsInput = {
  coverImage: '',
  title: '',
  slug: '',
  summary: '',
  category: '',
  content: '',
  status: 'draft',
}

export function CmsNewsNewPage() {
  const navigate = useNavigate()
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.news')
  const tCommon = useT('cms.common')
  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(formatDocumentTitle(t('newTitle'), officeName))

  if (!canWrite) {
    return (
      <div className="cms-pages">
        <p className="cms-form-error">{tCommon('editorsOnly')}</p>
        <Link to="/cms/news">{t('backToNews')}</Link>
      </div>
    )
  }

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('listTitle')}</span>
          <h1>{t('newTitle')}</h1>
        </div>
        <div className="cms-pages-header-actions">
          <Link to="/cms/news">{t('backToNews')}</Link>
        </div>
      </header>
      <NewsEditorForm
        mode="create"
        initial={empty}
        canWrite={canWrite}
        onSubmit={async (body) => {
          const created = await newsApi.cmsCreate(body)
          navigate(`/cms/news/${created.id}`, { replace: true })
        }}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { NewsEditorForm } from '../../components/cms/NewsEditorForm'
import { newsApi, type CmsNews, type NewsInput } from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'
import { siteTemplate } from '../../lib/site-template'

export function CmsNewsEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.news')
  const tCommon = useT('cms.common')
  const [item, setItem] = useState<CmsNews | null>(null)
  const [error, setError] = useState<string | null>(null)

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(
    formatDocumentTitle(canWrite ? t('editTitle') : t('viewTitle'), officeName),
  )

  useEffect(() => {
    if (!id) return
    newsApi
      .cmsById(id)
      .then(setItem)
      .catch((err: Error) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <div className="cms-pages">
        <p className="cms-form-error">{error}</p>
        <Link to="/cms/news">{t('backToNews')}</Link>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="cms-pages">
        <p className="cms-muted">{tCommon('loading')}</p>
      </div>
    )
  }

  const initial: NewsInput & { id: string } = {
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary ?? '',
    category: item.category ?? '',
    coverImage: item.coverImage ?? '',
    content: item.content ?? '',
    status: item.status,
  }

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('listTitle')}</span>
          <h1>{canWrite ? t('editTitle') : t('viewTitle')}</h1>
        </div>
        <div className="cms-pages-header-actions">
          <Link to="/cms/news">{t('backToNews')}</Link>
        </div>
      </header>
      <NewsEditorForm
        mode="edit"
        initial={initial}
        canWrite={canWrite}
        onSubmit={async (body) => {
          const updated = await newsApi.cmsUpdate(item.id, body)
          setItem(updated)
        }}
        onArchive={
          canWrite
            ? async () => {
                await newsApi.cmsArchive(item.id)
                navigate('/cms/news', { replace: true })
              }
            : undefined
        }
      />
    </div>
  )
}

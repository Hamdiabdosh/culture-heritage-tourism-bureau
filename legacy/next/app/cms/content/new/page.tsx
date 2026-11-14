import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireEditorOrAdmin } from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { PageEditorForm } from '@/components/cms-page-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'

export default async function CmsNewPagePage() {
  await requireEditorOrAdmin({ nextPath: '/cms/content/new' })
  const t = await getTranslations('cms.pages')

  try {
    await getActiveInstitutionId()
  } catch (error) {
    if (error instanceof InstitutionConfigError) {
      return <CmsInstitutionConfigError message={error.message} />
    }
    throw error
  }

  return (
    <main className="cms-pages">
      <div className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('listTitle')}</span>
          <h1>{t('newTitle')}</h1>
          <p>{t('newIntro')}</p>
        </div>
        <Link href="/cms/content">{t('backToPages')}</Link>
      </div>

      <section className="cms-panel cms-page-editor">
        <PageEditorForm
          mode="create"
          initial={{ title: '', slug: '', content: '', status: 'draft' }}
        />
      </section>
    </main>
  )
}

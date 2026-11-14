import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireEditorOrAdmin } from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { DocumentEditorForm } from '@/components/cms-document-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'

export default async function CmsNewDocumentPage() {
  await requireEditorOrAdmin({ nextPath: '/cms/documents/new' })
  const t = await getTranslations('cms.documents')

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
        <Link href="/cms/documents">{t('backToDocuments')}</Link>
      </div>

      <section className="cms-panel cms-page-editor">
        <DocumentEditorForm
          mode="create"
          initial={{
            title: '',
            slug: '',
            summary: '',
            category: '',
            year: '',
            fileUrl: '',
            fileType: '',
            fileSize: '',
            status: 'draft',
          }}
        />
      </section>
    </main>
  )
}

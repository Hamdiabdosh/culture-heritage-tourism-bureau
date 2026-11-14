import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireEditorOrAdmin } from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { ServiceEditorForm } from '@/components/cms-service-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'

export default async function CmsNewServicePage() {
  await requireEditorOrAdmin({ nextPath: '/cms/services/new' })
  const t = await getTranslations('cms.services')

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
        <Link href="/cms/services">{t('backToServices')}</Link>
      </div>

      <section className="cms-panel cms-page-editor">
        <ServiceEditorForm
          mode="create"
          initial={{
            title: '',
            slug: '',
            summary: '',
            description: '',
            category: '',
            responsibleOffice: '',
            eligibility: '',
            requiredDocuments: '',
            process: '',
            contact: '',
            icon: 'file',
            status: 'draft',
          }}
        />
      </section>
    </main>
  )
}

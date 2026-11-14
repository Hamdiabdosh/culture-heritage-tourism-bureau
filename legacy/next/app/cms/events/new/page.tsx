import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireEditorOrAdmin } from '@/lib/authz'
import {
  getActiveInstitutionId,
  InstitutionConfigError,
} from '@/lib/content/institution'
import { EventEditorForm } from '@/components/cms-event-form'
import { CmsInstitutionConfigError } from '@/components/cms-institution-error'

export default async function CmsNewEventPage() {
  await requireEditorOrAdmin({ nextPath: '/cms/events/new' })
  const t = await getTranslations('cms.events')

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
        <Link href="/cms/events">{t('backToEvents')}</Link>
      </div>

      <section className="cms-panel cms-page-editor">
        <EventEditorForm
          mode="create"
          initial={{
            title: '',
            slug: '',
            summary: '',
            content: '',
            eventDate: '',
            location: '',
            type: '',
            status: 'draft',
          }}
        />
      </section>
    </main>
  )
}

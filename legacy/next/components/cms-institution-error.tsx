import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function CmsInstitutionConfigError({ message }: { message: string }) {
  const t = await getTranslations('cms.config')
  const tCommon = await getTranslations('cms.common')

  return (
    <main className="cms-pages">
      <div className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('kicker')}</span>
          <h1>{t('notConfigured')}</h1>
          <p>{message}</p>
        </div>
        <Link href="/cms">{tCommon('backOverview')}</Link>
      </div>
      <section className="cms-panel" style={{ padding: 24 }}>
        <p className="cms-form-error" role="alert">
          {message}
        </p>
        <p style={{ color: '#66726d', fontSize: 13, lineHeight: 1.6 }}>{t('setupHelp')}</p>
      </section>
    </main>
  )
}

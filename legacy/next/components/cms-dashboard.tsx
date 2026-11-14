import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import {
  Building2,
  CalendarDays,
  FileText,
  FolderOpen,
  Newspaper,
  Plus,
} from 'lucide-react'
import { toIntlLocale } from '@/lib/content/public-format'

const contentAreas = [
  {
    href: '/cms/content',
    labelKey: 'pages' as const,
    descKey: 'pagesDesc' as const,
    icon: FileText,
  },
  {
    href: '/cms/news',
    labelKey: 'news' as const,
    descKey: 'newsDesc' as const,
    icon: Newspaper,
  },
  {
    href: '/cms/services',
    labelKey: 'services' as const,
    descKey: 'servicesDesc' as const,
    icon: Building2,
  },
  {
    href: '/cms/events',
    labelKey: 'events' as const,
    descKey: 'eventsDesc' as const,
    icon: CalendarDays,
  },
  {
    href: '/cms/documents',
    labelKey: 'documents' as const,
    descKey: 'documentsDesc' as const,
    icon: FolderOpen,
  },
] as const

const createActions = [
  { href: '/cms/content/new', labelKey: 'newPage' as const },
  { href: '/cms/news/new', labelKey: 'newArticle' as const },
  { href: '/cms/services/new', labelKey: 'newService' as const },
  { href: '/cms/events/new', labelKey: 'newEvent' as const },
  { href: '/cms/documents/new', labelKey: 'newDocument' as const },
] as const

export async function CmsDashboard({
  userName,
  canModify,
  institutionName,
}: {
  userName: string
  canModify: boolean
  institutionName: string
}) {
  const t = await getTranslations('cms.dashboard')
  const tNav = await getTranslations('cms.navigation')
  const locale = await getLocale()
  const greetingDate = new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const firstName = userName.trim().split(/\s+/)[0] || t('there')

  return (
    <main className="cms-content">
      <div className="cms-page-heading">
        <div>
          <span className="cms-kicker">{greetingDate}</span>
          <h1>{t('welcome', { name: firstName })}</h1>
          <p>
            {canModify
              ? t('manageIntro', { name: institutionName })
              : t('readonlyIntro', { name: institutionName })}
          </p>
        </div>
        {!canModify ? (
          <div className="cms-page-heading-actions">
            <span className="cms-readonly-badge">{t('viewerReadonly')}</span>
          </div>
        ) : null}
      </div>

      <section className="cms-panel cms-content-areas">
        <div className="cms-panel-heading">
          <div>
            <span className="cms-kicker">{t('contentKicker')}</span>
            <h2>{t('whatYouCanManage')}</h2>
          </div>
        </div>
        <div className="cms-area-grid">
          {contentAreas.map((area) => {
            const Icon = area.icon
            return (
              <Link key={area.href} href={area.href} className="cms-area-card">
                <span className="cms-shortcut-icon green">
                  <Icon />
                </span>
                <span>
                  <strong>{tNav(area.labelKey)}</strong>
                  <small>{t(area.descKey)}</small>
                </span>
                <b>→</b>
              </Link>
            )
          })}
        </div>
      </section>

      {canModify ? (
        <section className="cms-panel cms-create-panel">
          <div className="cms-panel-heading">
            <div>
              <span className="cms-kicker">{t('createKicker')}</span>
              <h2>{t('startSomethingNew')}</h2>
            </div>
          </div>
          <div className="cms-create-row">
            {createActions.map((action) => (
              <Link key={action.href} href={action.href} className="cms-create-chip">
                <Plus />
                {t(action.labelKey)}
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
          <p className="cms-muted cms-access-copy">{t('readonlyCopy')}</p>
          <div className="cms-access-links">
            <Link href="/cms/content">{t('viewPages')}</Link>
            <Link href="/cms/news">{t('viewNews')}</Link>
            <Link href="/">{t('openPublic')}</Link>
          </div>
        </section>
      )}
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Landmark,
  Megaphone,
  Menu,
  MessageSquare,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { institution, institutionConfig } from '@/lib/institution-config'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useScrollReveal } from '@/components/use-scroll-reveal'

export { institution }

const { navigation, homepage, relatedInstitutions } = institutionConfig

const serviceIcons: Record<string, LucideIcon> = {
  file: FileText,
  message: MessageSquare,
  megaphone: Megaphone,
  building: Building2,
  book: Landmark,
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const tHeader = useTranslations('header')
  const tNav = useTranslations('navigation')
  useScrollReveal()
  return (
    <>
      <a href="#main-content" className="skip-link">
        {tHeader('skipToMain')}
      </a>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>{institution.eyebrow}</span>
          <div className="utility-links">
            <Link href="/contact">{tNav('contact')}</Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Landmark size={23} />
            </span>
            <span>
              <strong>{institution.name}</strong>
              <small>{institution.tagline}</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label={tNav('primary')}>
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {tNav(item.key)}
              </Link>
            ))}
          </nav>
          <button
            className="mobile-menu"
            aria-label={open ? tHeader('closeMenu') : tHeader('openMenu')}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label={tNav('mobile')}>
            {navigation.map((item) => (
              <Link onClick={() => setOpen(false)} key={item.href} href={item.href}>
                {tNav(item.key)}
                <ArrowRight size={16} />
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  actionHref = '/news',
  className,
}: {
  eyebrow: string
  title: string
  action?: string
  actionHref?: string
  className?: string
}) {
  return (
    <div className={className ? `section-heading ${className}` : 'section-heading'}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <Link href={actionHref} className="text-link">
          {action} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  )
}

export function Footer() {
  const tNav = useTranslations('navigation')
  const tFooter = useTranslations('footer')

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand footer-brand">
            <span className="brand-mark">
              <Landmark size={20} />
            </span>
            <span>
              <strong>{institution.name}</strong>
              <small>{institution.tagline}</small>
            </span>
          </Link>
          <p className="footer-note">
            {tFooter('officialInformation', { name: institution.name })}
          </p>
        </div>
        <div>
          <h3>{tFooter('explore')}</h3>
          <Link href="/about">{tNav('about')}</Link>
          <Link href="/services">{tNav('services')}</Link>
          <Link href="/news">{tNav('news')}</Link>
          <Link href="/events">{tNav('events')}</Link>
        </div>
        <div>
          <h3>{tFooter('getInTouch')}</h3>
          <p>{institution.address}</p>
          <a href={`mailto:${institution.email}`}>{institution.email}</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 {institution.name}</span>
        <span>{tFooter('officialGovernmentWebsite')}</span>
      </div>
    </footer>
  )
}

export type HomePageProps = {
  services: PublicServiceCard[]
  news: PublicNewsCard[]
  documents: PublicDocumentCard[]
  featuredEvent: PublicEventCard | null
}

export function HomePage({
  services,
  news,
  documents,
  featuredEvent,
}: HomePageProps) {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const featuredAnnouncement = news[0] ?? null
  const announcementRows = news.slice(0, 2)
  const newsCards = news.slice(0, 3)

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow light motion-enter">{institution.eyebrow}</span>
              <h1 className="motion-enter motion-d1">{t('heroTitle')}</h1>
              <p className="motion-enter motion-d2">{institution.description}</p>
              <div className="hero-actions motion-enter motion-d3">
                <Link href="/services" className="button button-light">
                  {t('exploreServices')} <ArrowRight size={17} />
                </Link>
                <Link href="/about" className="button button-ghost">
                  {t('aboutTheOffice')}
                </Link>
              </div>
            </div>
            {homepage.notice && (
              <div className="hero-card motion-enter motion-d4">
                <span className="hero-card-label">{t('featuredAnnouncement')}</span>
                {featuredAnnouncement ? (
                  <>
                    <h2>{featuredAnnouncement.title}</h2>
                    <p>{featuredAnnouncement.summary}</p>
                    <Link
                      href={`/news/${featuredAnnouncement.slug}`}
                      className="text-link light-link"
                    >
                      {t('readAnnouncement')} <ArrowRight size={16} />
                    </Link>
                  </>
                ) : (
                  <p>{t('noAnnouncements')}</p>
                )}
              </div>
            )}
          </div>
        </section>
        <section className="trust-strip">
          <div className="container trust-inner motion-enter">
            <span>{t('ourRole')}</span>
            <p>{t('roleText')}</p>
            <Link href="/about">
              {tCommon('learnMore')} <ArrowRight size={15} />
            </Link>
          </div>
        </section>
        {homepage.services && (
          <section className="section">
            <div className="container">
              <SectionHeading
                className="reveal"
                eyebrow={t('whatWeDo')}
                title={t('servicesAndInformation')}
                action={t('viewAllServices')}
                actionHref="/services"
              />
              <div className="service-grid">
                {services.length === 0 ? (
                  <p className="muted reveal reveal-d1">{t('noServices')}</p>
                ) : (
                  services.map((item, index) => {
                    const Icon = serviceIcons[item.icon] ?? serviceIcons.file
                    const delay = index === 0 ? '' : ` reveal-d${Math.min(index, 5)}`
                    return (
                      <Link
                        href={`/services/${item.slug}`}
                        className={`service-card reveal${delay}`}
                        key={item.id}
                      >
                        <span className="icon-box">
                          <Icon size={21} />
                        </span>
                        <h3>{item.title}</h3>
                        <p>{item.summary}</p>
                        <ArrowRight className="card-arrow" size={18} />
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          </section>
        )}
        {homepage.news && (
          <section className="section tinted">
            <div className="container split-section">
              <div className="section-intro reveal">
                <span className="eyebrow">{tCommon('fromTheOffice')}</span>
                <h2>{t('announcementsHeading')}</h2>
                <p>{t('announcementsIntro')}</p>
                <Link href="/news" className="button button-dark">
                  {t('allNewsUpdates')} <ArrowRight size={16} />
                </Link>
              </div>
              <div className="news-list reveal reveal-d1">
                {announcementRows.length === 0 ? (
                  <p className="muted">{t('noAnnouncements')}</p>
                ) : (
                  announcementRows.map((item) => (
                    <NewsRow
                      key={item.id}
                      date={item.date}
                      category={item.category}
                      title={item.title}
                      text={item.summary}
                      href={`/news/${item.slug}`}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}
        {homepage.news && (
          <section className="section">
            <div className="container">
              <SectionHeading
                className="reveal"
                eyebrow={t('latestUpdates')}
                title={t('newsAndStories')}
                action={t('seeAllNews')}
              />
              <div className="news-grid">
                {newsCards.length === 0 ? (
                  <p className="muted reveal reveal-d1">{t('noNews')}</p>
                ) : (
                  newsCards.map((item, index) => (
                    <NewsCard
                      key={item.id}
                      className={`reveal${index === 0 ? '' : ` reveal-d${Math.min(index, 5)}`}`}
                      date={item.date}
                      category={item.category}
                      title={item.title}
                      text={item.summary}
                      href={`/news/${item.slug}`}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}
        {homepage.resources && (
          <section className="section resources-section">
            <div className="container split-section">
              <div className="reveal">
                <span className="eyebrow">{t('usefulResources')}</span>
                <h2>{t('documentsFormsReports')}</h2>
                <p className="section-description">{t('resourcesIntro')}</p>
              </div>
              <div className="resource-list">
                {documents.length === 0 ? (
                  <p className="muted reveal reveal-d1">{t('noDocuments')}</p>
                ) : (
                  documents.map((doc, index) => (
                    <Resource
                      key={doc.id}
                      className={`reveal${index === 0 ? '' : ` reveal-d${Math.min(index, 5)}`}`}
                      title={doc.title}
                      type={doc.category}
                      meta={doc.meta}
                      href={`/resources/${doc.slug}`}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}
        {homepage.events && (
          <section className="section events-section">
            <div className="container">
              <SectionHeading
                className="reveal"
                eyebrow={tCommon('calendar')}
                title={tCommon('upcomingEvents')}
              />
              {featuredEvent ? (
                <div className="event-card reveal reveal-d1">
                  <div className="event-date">
                    <strong>{featuredEvent.day}</strong>
                    <span>
                      {featuredEvent.month}
                      <br />
                      {featuredEvent.year}
                    </span>
                  </div>
                  <div>
                    <span className="eyebrow">{featuredEvent.type}</span>
                    <h3>{featuredEvent.title}</h3>
                    <p>
                      <CalendarDays size={15} /> {featuredEvent.location}
                    </p>
                  </div>
                  <Link href={`/events/${featuredEvent.slug}`} className="button button-outline">
                    {tCommon('eventDetails')} <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <p className="muted reveal reveal-d1">{t('noEvents')}</p>
              )}
            </div>
          </section>
        )}
        {homepage.partners && (
          <section className="partners">
            <div className="container partners-inner">
              <div className="reveal">
                <span className="eyebrow">{t('workingTogether')}</span>
                <h2>{t('relatedInstitutions')}</h2>
              </div>
              <div className="partner-links reveal reveal-d1">
                {relatedInstitutions.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}

export function NewsCard({
  date,
  category,
  title,
  text,
  href = '/news',
  className,
}: {
  date: string
  category: string
  title: string
  text: string
  href?: string
  className?: string
}) {
  const t = useTranslations('common')
  return (
    <article className={className ? `news-card ${className}` : 'news-card'}>
      <div className="news-meta">
        <span>{category}</span>
        <time>{date}</time>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <Link href={href} className="text-link">
        {t('readMore')} <ArrowRight size={15} />
      </Link>
    </article>
  )
}

export function NewsRow({
  date,
  category,
  title,
  text,
  href,
}: {
  date: string
  category: string
  title: string
  text: string
  href?: string
}) {
  const body = (
    <>
      <div className="news-row-date">
        <span>{date.split(' ')[0]}</span>
        <small>{date.split(' ').slice(1).join(' ')}</small>
      </div>
      <div>
        <span className="category">{category}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ArrowRight size={18} />
    </>
  )

  if (href) {
    return (
      <Link href={href} className="news-row">
        {body}
      </Link>
    )
  }

  return <article className="news-row">{body}</article>
}

function Resource({
  title,
  type,
  href = '/resources',
  meta,
  className,
}: {
  title: string
  type: string
  href?: string
  meta?: string
  className?: string
}) {
  return (
    <Link href={href} className={className ? `resource ${className}` : 'resource'}>
      <span className="resource-icon">
        <FileText size={19} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>
          {type}
          {meta ? ` · ${meta}` : ''} <Download size={13} />
        </small>
      </span>
      <ArrowRight size={17} />
    </Link>
  )
}

/** Public services directory — filled from PostgreSQL on /services. */
export type PublicServiceCard = {
  id: string
  slug: string
  title: string
  summary: string
  icon: string
}

export function DirectoryPage({ items }: { items: PublicServiceCard[] }) {
  const t = useTranslations('services')
  const tCommon = useTranslations('common')
  const [query, setQuery] = useState('')
  const filtered = items.filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.summary.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">{tCommon('publicAccess')}</span>
          <h1>{t('directoryTitle')}</h1>
          <p>{t('directoryIntro', { name: institution.name })}</p>
        </div>
        <div className="container directory">
          <label className="search-box reveal">
            <Search size={19} />
            <input
              aria-label={t('searchLabel')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
            />
          </label>
          <div className="directory-layout reveal reveal-d1">
            <aside>
              <span className="eyebrow">{t('filterByTopic')}</span>
              <button className="filter-active">
                {t('allServices')} <span>{items.length}</span>
              </button>
              <button>{t('filterInformation')}</button>
              <button>{t('filterApplications')}</button>
              <button>{t('filterContact')}</button>
            </aside>
            <div className="directory-results">
              <div className="results-head">
                <span>{t('servicesCount', { count: filtered.length })}</span>
                <span>{t('publishedServices')}</span>
              </div>
              {filtered.length === 0 ? (
                <p className="muted">{t('noMatch')}</p>
              ) : (
                filtered.map((item) => {
                  const Icon = serviceIcons[item.icon] ?? serviceIcons.file
                  return (
                    <Link href={`/services/${item.slug}`} className="directory-card" key={item.id}>
                      <span className="icon-box">
                        <Icon size={21} />
                      </span>
                      <div>
                        <h2>{item.title}</h2>
                        <p>{item.summary}</p>
                        <span className="text-link">
                          {t('viewService')} <ArrowRight size={15} />
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

/**
 * About presentation — layout is fixed; CMS supplies title + narrative.
 * First content paragraph → intro lead; remaining → "Our mandate".
 * Quote + priority cards stay as template chrome (Pages CMS is a single text field).
 */
export function AboutPage({ title, content }: { title: string; content: string }) {
  const t = useTranslations('about')
  const tCommon = useTranslations('common')
  const paragraphs = content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const [first, ...rest] = paragraphs
  const lead = rest.length > 0 ? first : null
  const mandate = rest.length > 0 ? rest : first ? [first] : []

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">{t('eyebrow')}</span>
          <h1>{title}</h1>
          {lead ? <p>{lead}</p> : null}
        </div>
        <section className="container about-layout">
          <div className="about-main">
            <div className="quote-block reveal">
              <span>“</span>
              <p>{t('quote')}</p>
            </div>
            <div className="reveal reveal-d1">
              <h2>{t('ourMandate')}</h2>
              {mandate.length === 0 ? (
                <p className="muted">{tCommon('noPageContent')}</p>
              ) : (
                mandate.map((para, i) => <p key={i}>{para}</p>)
              )}
            </div>
            <div className="reveal reveal-d2">
              <h2>{t('ourPriorities')}</h2>
              <div className="priority-grid">
                <div>
                  <strong>01</strong>
                  <h3>{t('priorityAccess')}</h3>
                  <p>{t('priorityAccessText')}</p>
                </div>
                <div>
                  <strong>02</strong>
                  <h3>{t('priorityCapability')}</h3>
                  <p>{t('priorityCapabilityText')}</p>
                </div>
                <div>
                  <strong>03</strong>
                  <h3>{t('priorityAccountability')}</h3>
                  <p>{t('priorityAccountabilityText')}</p>
                </div>
              </div>
            </div>
          </div>
          <aside className="side-card reveal reveal-d3">
            <span className="eyebrow">{tCommon('officeInformation')}</span>
            <h3>{institution.name}</h3>
            <dl>
              <dt>{t('headOffice')}</dt>
              <dd>{institution.address}</dd>
              <dt>{tCommon('workingHours')}</dt>
              <dd>{institution.hours}</dd>
              <dt>{tCommon('contact')}</dt>
              <dd>{institution.email}</dd>
            </dl>
            <Link href="/contact" className="text-link">
              {tCommon('contactTheOffice')} <ArrowRight size={15} />
            </Link>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  )
}

/** Informational contact page — values come from institutionConfig, not CMS. */
export function ContactPage() {
  const t = useTranslations('contact')
  const tCommon = useTranslations('common')
  const phoneHref = `tel:${institution.phone.replace(/[^\d+]/g, '')}`
  const mailHref = `mailto:${institution.email}`

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">{t('eyebrow')}</span>
          <h1>{t('title')}</h1>
          <p>{t('intro', { name: institution.name })}</p>
        </div>
        <section className="container contact-section">
          <aside className="side-card reveal">
            <span className="eyebrow">{tCommon('officeInformation')}</span>
            <h2>{institution.name}</h2>
            <dl>
              <dt>{t('address')}</dt>
              <dd>{institution.address}</dd>
              <dt>{t('phone')}</dt>
              <dd>
                <a href={phoneHref}>{institution.phone}</a>
              </dd>
              <dt>{t('email')}</dt>
              <dd>
                <a href={mailHref}>{institution.email}</a>
              </dd>
              <dt>{tCommon('workingHours')}</dt>
              <dd>{institution.hours}</dd>
            </dl>
            <div className="contact-actions">
              <a className="button button-dark" href={phoneHref}>
                {t('call', { phone: institution.phone })}
              </a>
              <a className="button button-outline" href={mailHref}>
                {t('emailAction', { email: institution.email })}
              </a>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  )
}

/** Shape for public News listing — filled from PostgreSQL on /news. */
export type PublicNewsCard = {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  date: string
}

export function NewsPage({ items }: { items: PublicNewsCard[] }) {
  const t = useTranslations('news')
  const tCommon = useTranslations('common')
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">{tCommon('fromTheOffice')}</span>
          <h1>{t('title')}</h1>
          <p>{t('intro', { name: institution.name })}</p>
        </div>
        <div className="container news-page">
          <div className="news-filters reveal">
            <button className="filter-active">{t('allUpdates')}</button>
            <button>{t('announcements')}</button>
            <button>{t('publicNotices')}</button>
            <button>{t('stories')}</button>
          </div>
          <div className="news-listing reveal reveal-d1">
            {items.length === 0 ? (
              <p className="muted">{t('empty')}</p>
            ) : (
              items.map((item) => (
                <NewsCard
                  key={item.id}
                  date={item.date}
                  category={item.category}
                  title={item.title}
                  text={item.summary}
                  href={`/news/${item.slug}`}
                />
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export type PublicNewsArticle = {
  title: string
  category: string
  date: string
  summary: string
  content: string
}

export function ArticlePage({ title, category, date, summary, content }: PublicNewsArticle) {
  const t = useTranslations('news')
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="article-page">
        <article className="container article">
          <Link href="/news" className="back-link motion-enter">
            {t('backToNews')}
          </Link>
          <span className="eyebrow motion-enter">
            {category} · {date}
          </span>
          <h1 className="motion-enter motion-d1">{title}</h1>
          {summary ? <p className="article-lead motion-enter motion-d2">{summary}</p> : null}
          <div className="article-byline motion-enter motion-d3">
            <Clock3 size={16} /> {t('publishedBy', { name: institution.name })} <span>•</span> {date}
          </div>
          <div className="article-rule" />
          <div className="article-content reveal">
            {content.split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

export type PublicServiceDetail = {
  title: string
  summary: string
  description: string
  category: string
  process: string[]
  icon: string
  responsibleOffice: string
  eligibility: string
  contact: string
  requiredDocuments: string[]
}

export function ServiceDetailPage({ service }: { service: PublicServiceDetail }) {
  const t = useTranslations('services')
  const tCommon = useTranslations('common')
  const Icon = serviceIcons[service.icon] ?? serviceIcons.file
  const hasDescription = Boolean(service.description.trim())
  const hasEligibility = Boolean(service.eligibility.trim())
  const requiredDocuments = service.requiredDocuments.filter((doc) => doc.trim())
  const processSteps = service.process.filter((step) => step.trim())
  const hasResponsibleOffice = Boolean(service.responsibleOffice.trim())
  const hasContact = Boolean(service.contact.trim())

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container service-detail">
          <Link href="/services" className="back-link motion-enter">
            {t('backToServices')}
          </Link>
          <div className="detail-icon icon-box motion-enter">
            <Icon size={27} />
          </div>
          <span className="eyebrow motion-enter">{service.category}</span>
          <h1 className="motion-enter motion-d1">{service.title}</h1>
          {service.summary ? (
            <p className="detail-lead motion-enter motion-d2">{service.summary}</p>
          ) : null}
          <div className="detail-grid">
            <div className="reveal">
              {hasDescription ? (
                <>
                  <h2>{t('aboutThisService')}</h2>
                  <p>{service.description}</p>
                </>
              ) : null}
              {hasEligibility ? (
                <>
                  <h2>{t('eligibility')}</h2>
                  <p>{service.eligibility}</p>
                </>
              ) : null}
              {requiredDocuments.length > 0 ? (
                <>
                  <h2>{t('requiredDocuments')}</h2>
                  <ul>
                    {requiredDocuments.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {processSteps.length > 0 ? (
                <>
                  <h2>{t('process')}</h2>
                  <ul>
                    {processSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {hasResponsibleOffice ? (
                <>
                  <h2>{t('responsibleOffice')}</h2>
                  <p>{service.responsibleOffice}</p>
                </>
              ) : null}
              {hasContact ? (
                <>
                  <h2>{tCommon('contact')}</h2>
                  <p>{service.contact}</p>
                </>
              ) : null}
            </div>
            <aside className="side-card reveal reveal-d1">
              <span className="eyebrow">{t('needHelp')}</span>
              <h3>{tCommon('contactTheOffice')}</h3>
              <p>{t('helpText')}</p>
              <Link href="/contact" className="button button-dark">
                {tCommon('getInTouch')} <ArrowRight size={16} />
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

/** Public events listing — filled from PostgreSQL on /events. */
export type PublicEventCard = {
  id: string
  slug: string
  title: string
  summary: string
  location: string
  type: string
  day: string
  month: string
  year: string
}

export function EventsPage({ items }: { items: PublicEventCard[] }) {
  const t = useTranslations('events')
  const tCommon = useTranslations('common')
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">{tCommon('calendar')}</span>
          <h1>{tCommon('upcomingEvents')}</h1>
          <p>{t('intro', { name: institution.name })}</p>
        </div>
        <div className="container news-page reveal">
          {items.length === 0 ? (
            <p className="muted">{t('empty')}</p>
          ) : (
            <div className="news-listing">
              {items.map((item) => (
                <article className="event-card" key={item.id}>
                  <div className="event-date">
                    <strong>{item.day}</strong>
                    <span>
                      {item.month}
                      <br />
                      {item.year}
                    </span>
                  </div>
                  <div>
                    <span className="eyebrow">{item.type}</span>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    <p>
                      <CalendarDays size={15} /> {item.location}
                    </p>
                    <Link href={`/events/${item.slug}`} className="text-link">
                      {tCommon('eventDetails')} <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export type PublicEventDetail = {
  title: string
  summary: string
  content: string
  location: string
  type: string
  day: string
  month: string
  year: string
  dateLabel: string
}

export function EventDetailPage({ event }: { event: PublicEventDetail }) {
  const t = useTranslations('events')
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="article-page">
        <article className="container article">
          <Link href="/events" className="back-link motion-enter">
            {t('backToEvents')}
          </Link>
          <span className="eyebrow motion-enter">
            {event.type} · {event.dateLabel}
          </span>
          <h1 className="motion-enter motion-d1">{event.title}</h1>
          {event.summary ? <p className="article-lead motion-enter motion-d2">{event.summary}</p> : null}
          <div className="article-byline motion-enter motion-d3">
            <CalendarDays size={16} /> {event.location || t('locationTbc')}{' '}
            <span>•</span> {event.dateLabel}
          </div>
          <div className="article-rule" />
          <div className="article-content reveal">
            {(event.content || '')
              .split(/\n+/)
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

/** Public resources listing — filled from PostgreSQL on /resources. */
export type PublicDocumentCard = {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  meta: string
}

export function ResourcesPage({ items }: { items: PublicDocumentCard[] }) {
  const t = useTranslations('resources')
  const tCommon = useTranslations('common')
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="inner-page">
        <div className="container page-intro motion-enter">
          <span className="eyebrow">{tCommon('publicAccess')}</span>
          <h1>{t('title')}</h1>
          <p>{t('intro', { name: institution.name })}</p>
        </div>
        <div className="container news-page reveal">
          {items.length === 0 ? (
            <p className="muted">{t('empty')}</p>
          ) : (
            <div className="resource-list">
              {items.map((item) => (
                <Link href={`/resources/${item.slug}`} className="resource" key={item.id}>
                  <span className="resource-icon">
                    <FileText size={19} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.category}
                      {item.meta ? ` · ${item.meta}` : ''} <Download size={13} />
                    </small>
                    {item.summary ? <span className="resource-summary">{item.summary}</span> : null}
                  </span>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export type PublicDocumentDetail = {
  title: string
  summary: string
  category: string
  year: string
  fileUrl: string
  fileType: string
  fileSize: string
  meta: string
}

export function ResourceDetailPage({ document }: { document: PublicDocumentDetail }) {
  const t = useTranslations('resources')
  const tCommon = useTranslations('common')
  const eyebrow = [document.category, document.year].filter(Boolean).join(' · ')
  const canDownload = Boolean(document.fileUrl)

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="article-page">
        <article className="container article">
          <Link href="/resources" className="back-link motion-enter">
            {t('backToResources')}
          </Link>
          {eyebrow ? <span className="eyebrow motion-enter">{eyebrow}</span> : null}
          <h1 className="motion-enter motion-d1">{document.title}</h1>
          {document.summary ? <p className="article-lead motion-enter motion-d2">{document.summary}</p> : null}
          {document.meta ? (
            <div className="article-byline motion-enter motion-d3">
              <FileText size={16} /> {document.meta}
            </div>
          ) : null}
          <div className="article-rule" />
          <div className="article-callout resource-download reveal">
            <Download />
            <div>
              <strong>{t('documentDownload')}</strong>
              <p>
                {canDownload
                  ? t('openOrDownload', {
                      fileType: document.fileType || tCommon('file'),
                      shortName: institution.shortName,
                    })
                  : t('noDownloadLink')}
              </p>
            </div>
            {canDownload ? (
              <a
                className="button button-dark"
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {document.fileType
                  ? t('downloadWithType', { type: document.fileType })
                  : t('download')}
              </a>
            ) : (
              <span className="button button-dark" aria-disabled="true">
                {t('downloadUnavailable')}
              </span>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

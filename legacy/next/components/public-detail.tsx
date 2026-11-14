'use client'

import Link from 'next/link'
import { ArrowLeft, CalendarDays, Download, Mail, MapPin } from 'lucide-react'
import { institution } from '@/lib/institution-config'

export function DetailPage({ title, eyebrow, summary, body, meta, backHref, backLabel = 'Back' }: { title: string; eyebrow: string; summary?: string; body?: string; meta?: string[]; backHref: string; backLabel?: string }) {
  return <main className="container detail-page"><Link className="back-link" href={backHref}><ArrowLeft /> {backLabel}</Link><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{summary && <p className="detail-summary">{summary}</p>}{meta && <div className="detail-meta">{meta.map((item) => <span key={item}>{item}</span>)}</div>}<div className="detail-body"><p>{body || `This page provides official information from the ${institution.name}. Content will be managed and published through the institution platform.`}</p><div className="detail-callout"><strong>Need more information?</strong><span>Contact {institution.name} at {institution.email} or {institution.phone}.</span><Link href="/contact">Contact the office</Link></div></div></main>
}

export function ListingEmpty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><h2>{title}</h2><p>{text}</p></div> }

export function ResourceDetail({ title, category, meta }: { title: string; category: string; meta: string }) { return <main className="container detail-page"><Link className="back-link" href="/resources"><ArrowLeft /> Back to resources</Link><span className="eyebrow">{category}</span><h1>{title}</h1><p className="detail-summary">Official document from {institution.name}.</p><div className="detail-meta"><span>{meta}</span><span>Published by {institution.shortName}</span></div><div className="detail-callout"><Download /><div><strong>Document download</strong><span>This frontend template demonstrates the download action. File storage will be connected later.</span></div><button className="button button-dark" type="button">Download {meta.split(' · ')[0]}</button></div></main>}

export function ContactInfo() { return <div className="contact-info"><span><MapPin />{institution.address}</span><span><Mail />{institution.email}</span><span><CalendarDays />{institution.hours}</span></div> }

export function AdminPlaceholder({ title }: { title: string }) { return <main className="container page-intro"><span className="eyebrow">Administration</span><h1>{title}</h1><p>This frontend-only CMS surface is ready for backend implementation in Cursor.</p><div className="empty-state"><h2>Mock workspace</h2><p>Connect this screen to your content model, permissions and API later.</p></div></main> }

export function createMetadata(title: string) { return { title: `${title} | ${institution.name}`, description: institution.description } }

export function DetailHeader({ title, subtitle }: { title: string; subtitle: string }) { return <header className="container page-intro"><span className="eyebrow">{institution.eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></header> }

export function ContactFooter() { return <footer className="container"><ContactInfo /></footer> }

export function NotFoundContent() { return <ListingEmpty title="Page not found" text="The requested information is not available." /> }

export function SearchHint() { return <p className="muted">Search across public information, services, news and documents.</p> }

export function StatusBadge({ children }: { children: React.ReactNode }) { return <span className="status-pill">{children}</span> }

export function ContentLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="text-link" href={href}>{children}</Link> }

export function AdminLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="button button-outline" href={href}>{children}</Link> }

export function FooterNote() { return <p className="muted">Official government information for public use.</p> }

export function DetailSection({ heading, children }: { heading: string; children: React.ReactNode }) { return <section className="detail-section"><h2>{heading}</h2>{children}</section> }

export function SafeText({ value }: { value?: string }) { return <>{value || 'Information will be published here.'}</> }

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="back-link" href={href}><ArrowLeft /> {children}</Link> }

export function SimpleCard({ href, title, text }: { href: string; title: string; text: string }) { return <Link className="content-card" href={href}><strong>{title}</strong><span>{text}</span></Link> }

export function SearchBox({ placeholder = 'Search' }: { placeholder?: string }) { return <label className="search-box"><input aria-label={placeholder} placeholder={placeholder} /></label> }

export function PublicShell({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function AdminNotice() { return <aside className="detail-callout"><strong>Frontend mockup</strong><span>No changes are persisted yet. Backend engineering will connect this interface later.</span></aside> }

export function PageTitle({ title, description }: { title: string; description: string }) { return <div className="container page-intro"><span className="eyebrow">{institution.eyebrow}</span><h1>{title}</h1><p>{description}</p></div> }

export function ContactCard() { return <div className="detail-callout"><strong>{institution.name}</strong><span>{institution.phone} · {institution.email}</span></div> }

export function InlineAction({ href, label }: { href: string; label: string }) { return <Link className="text-link" href={href}>{label} →</Link> }

export function DetailGrid({ items }: { items: string[] }) { return <div className="detail-grid">{items.map((item) => <div key={item}><strong>{item}</strong></div>)}</div> }

export function AdminRouteNote() { return <AdminNotice /> }

export function ArticleBody({ paragraphs }: { paragraphs: string[] }) { return <div className="article-body">{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div> }

export function LinkList({ links }: { links: { href: string; label: string }[] }) { return <div className="link-list">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div> }

export function DocumentAction() { return <button className="button button-dark" type="button"><Download /> Download document</button> }

export function EmptyState({ title, description }: { title: string; description: string }) { return <ListingEmpty title={title} text={description} /> }

export function SectionTitle({ title, label }: { title: string; label: string }) { return <div className="panel-heading"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div></div> }

export function InstitutionalContact() { return <ContactInfo /> }

export function DetailLink({ href, label }: { href: string; label: string }) { return <Link href={href} className="text-link">{label}</Link> }

export function MetadataList({ values }: { values: string[] }) { return <div className="detail-meta">{values.map((value) => <span key={value}>{value}</span>)}</div> }

export function MockForm() { return <form className="contact-form"><label>Name<input required /></label><label>Email<input type="email" required /></label><label>Message<textarea required rows={5} /></label><button className="button button-dark" type="submit">Send message</button></form> }

export function PageFooter() { return <div className="container page-footer"><FooterNote /></div> }

export function DataNotice() { return <p className="muted">Sample content for the reusable institutional template.</p> }

export function ArticleMeta({ date, author }: { date: string; author: string }) { return <div className="detail-meta"><span>{date}</span><span>{author}</span></div> }

export function DetailActions({ href }: { href: string }) { return <Link className="button button-outline" href={href}>Return to listing</Link> }

export function SimplePage({ title, description }: { title: string; description: string }) { return <><PageTitle title={title} description={description} /><main className="container"><AdminNotice /></main></> }

export function RouteLabel({ children }: { children: React.ReactNode }) { return <span className="eyebrow">{children}</span> }

export function ExternalNotice() { return <p className="muted">External links will be configured by the institution administrator.</p> }

export function TableEmpty() { return <ListingEmpty title="No items yet" text="There is no content to show in this view." /> }

export function Breadcrumb({ href, label }: { href: string; label: string }) { return <BackLink href={href}>{label}</BackLink> }

export function ContactLink() { return <Link href="/contact" className="text-link">Contact us</Link> }

export function PublicPageEnd() { return <div className="container page-footer"><ContactLink /></div> }

export function LanguageReady() { return <span className="muted">Available in English, Amharic, Afaan Oromo and Harari.</span> }

export function LegalNote() { return <small className="muted">Information is provided for public service use.</small> }

export function CardGrid({ children }: { children: React.ReactNode }) { return <div className="card-grid">{children}</div> }

export function Panel({ children }: { children: React.ReactNode }) { return <section className="admin-panel">{children}</section> }

export function RouteDescription({ children }: { children: React.ReactNode }) { return <p className="detail-summary">{children}</p> }

export function ContentSummary({ children }: { children: React.ReactNode }) { return <div className="article-body">{children}</div> }

export function PageBack({ href }: { href: string }) { return <BackLink href={href}>Back</BackLink> }

export function OfficialLabel() { return <span className="eyebrow">Official information</span> }

export function ContentFooter() { return <div className="detail-callout"><ContactLink /></div> }

export function EmptyResults() { return <ListingEmpty title="No results" text="Try a different search or filter." /> }

export function PageContainer({ children }: { children: React.ReactNode }) { return <main className="container">{children}</main> }

export function RouteTitle({ title }: { title: string }) { return <h1>{title}</h1> }

export function PublicContact() { return <ContactLink /> }

export function EditorPlaceholder() { return <AdminNotice /> }

export function DetailList({ items }: { items: string[] }) { return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> }

export function SiteIdentity() { return <strong>{institution.shortName}</strong> }

export function ConfigNotice() { return <DataNotice /> }

export function PageSection({ children }: { children: React.ReactNode }) { return <section className="detail-section">{children}</section> }

export function Breadcrumbs({ href, label }: { href: string; label: string }) { return <Breadcrumb href={href} label={label} /> }

export function StatusText({ children }: { children: React.ReactNode }) { return <StatusBadge>{children}</StatusBadge> }

export function SafeLink({ href, label }: { href: string; label: string }) { return <DetailLink href={href} label={label} /> }

export function PublicHeading({ title }: { title: string }) { return <RouteTitle title={title} /> }

export function CmsOnly() { return <AdminRouteNote /> }

export function ContactPrompt() { return <ContactCard /> }

export function ResourceMeta({ meta }: { meta: string }) { return <MetadataList values={[meta]} /> }

export function DetailContent({ content }: { content: string }) { return <ArticleBody paragraphs={[content]} /> }

export function SimpleNotice() { return <DataNotice /> }

export function PageIntro({ title, description }: { title: string; description: string }) { return <PageTitle title={title} description={description} /> }

export function ReturnLink({ href }: { href: string }) { return <DetailActions href={href} /> }

export function PublicMeta({ values }: { values: string[] }) { return <MetadataList values={values} /> }

export function ContentNotice() { return <AdminNotice /> }

export function PageSpacer() { return <div aria-hidden="true" style={{ height: 24 }} /> }

export function InstitutionalName() { return <>{institution.name}</> }

export function ContactDetails() { return <ContactInfo /> }

export function DetailTitle({ title }: { title: string }) { return <h1>{title}</h1> }

export function PageNotice() { return <DataNotice /> }

export function SimpleDetail({ title, backHref }: { title: string; backHref: string }) { return <DetailPage title={title} eyebrow="Official information" backHref={backHref} /> }

export function AppShell({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function FeatureNote() { return <DataNotice /> }

export function AdminOnlyNote() { return <AdminNotice /> }

export function PublicInfo() { return <LegalNote /> }

export function DetailFooter() { return <ContentFooter /> }

export function RouteCard({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="View official information" /> }

export function RelatedLinks({ href, label }: { href: string; label: string }) { return <InlineAction href={href} label={label} /> }

export function GovernmentLabel() { return <OfficialLabel /> }

export function SiteFooter() { return <PageFooter /> }

export function DetailSummary({ children }: { children: React.ReactNode }) { return <RouteDescription>{children}</RouteDescription> }

export function PageLoading() { return <ListingEmpty title="Loading" text="Preparing public information." /> }

export function ErrorState() { return <ListingEmpty title="Something went wrong" text="Please try again later." /> }

export function NotFoundState() { return <NotFoundContent /> }

export function NoSearchResults() { return <EmptyResults /> }

export function PageShell({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function PublicLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="text-link">{children}</Link> }

export function Section({ children }: { children: React.ReactNode }) { return <section>{children}</section> }

export function AccessibilityNote() { return <LegalNote /> }

export function EndMark() { return null }

export function PageAction({ href, label }: { href: string; label: string }) { return <InlineAction href={href} label={label} /> }

export function AdminLabel() { return <RouteLabel>Administration</RouteLabel> }

export function DocumentDownload() { return <DocumentAction /> }

export function OfficialContact() { return <ContactCard /> }

export function DynamicContent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function PublicDataNote() { return <DataNotice /> }

export function PageEnd() { return null }

export function RouteNotFound() { return <NotFoundState /> }

export function ContentType({ children }: { children: React.ReactNode }) { return <RouteLabel>{children}</RouteLabel> }

export function SiteName() { return <SiteIdentity /> }

export function ContactDetailsCard() { return <ContactCard /> }

export function DocumentCard({ href, title, meta }: { href: string; title: string; meta: string }) { return <SimpleCard href={href} title={title} text={meta} /> }

export function NewsCard({ href, title, summary }: { href: string; title: string; summary: string }) { return <SimpleCard href={href} title={title} text={summary} /> }

export function ServiceCard({ href, title, summary }: { href: string; title: string; summary: string }) { return <SimpleCard href={href} title={title} text={summary} /> }

export function AdminCard({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="Open workspace" /> }

export function TextContent({ children }: { children: React.ReactNode }) { return <p>{children}</p> }

export function SectionNote() { return <DataNotice /> }

export function SiteContact() { return <ContactInfo /> }

export function SearchResult({ href, title, text }: { href: string; title: string; text: string }) { return <SimpleCard href={href} title={title} text={text} /> }

export function RouteFooter() { return <ContentFooter /> }

export function CmsLink() { return <Link className="text-link" href="/admin">Open CMS</Link> }

export function FinalNote() { return <DataNotice /> }

export function DetailPageEnd() { return null }

export function GovernmentContact() { return <ContactInfo /> }

export function PublicDocument({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="View document" /> }

export function PublicService({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="View service" /> }

export function PublicNews({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="Read update" /> }

export function PublicEvent({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="View event" /> }

export function PublicDepartment({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="View department" /> }

export function PublicLeader({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="View profile" /> }

export function PublicResource({ href, title }: { href: string; title: string }) { return <SimpleCard href={href} title={title} text="View resource" /> }

export function SimpleBack({ href }: { href: string }) { return <PageBack href={href} /> }

export function GovernmentSiteName() { return <InstitutionalName /> }

export function AdminFooter() { return <AdminRouteNote /> }

export function ContactPageNote() { return <DataNotice /> }

export function RouteContent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function PublicRouteNote() { return <DataNotice /> }

export function ContentDetail({ title, backHref }: { title: string; backHref: string }) { return <SimpleDetail title={title} backHref={backHref} /> }

export function FooterContact() { return <ContactLink /> }

export function PageStatus() { return <StatusText>Published</StatusText> }

export function CmsStatus() { return <StatusText>Frontend only</StatusText> }

export function DetailContact() { return <ContactPrompt /> }

export function PublicPageTitle({ title }: { title: string }) { return <RouteTitle title={title} /> }

export function CurrentInstitution() { return <InstitutionalName /> }

export function SiteDescription() { return <>{institution.description}</> }

export function PageMessage({ children }: { children: React.ReactNode }) { return <p>{children}</p> }

export function AdminContentNote() { return <AdminNotice /> }

export function GovernmentFooter() { return <SiteFooter /> }

export function PageHeader({ title, description }: { title: string; description: string }) { return <PageTitle title={title} description={description} /> }

export function PublicCard({ href, title, description }: { href: string; title: string; description: string }) { return <SimpleCard href={href} title={title} text={description} /> }

export function DataSourceNote() { return <DataNotice /> }

export function RouteCardGrid({ children }: { children: React.ReactNode }) { return <CardGrid>{children}</CardGrid> }

export function CmsPageNote() { return <AdminNotice /> }

export function PublicRouteCard({ href, title }: { href: string; title: string }) { return <RouteCard href={href} title={title} /> }

export function ContactRoute() { return <ContactLink /> }

export function RouteMeta({ children }: { children: React.ReactNode }) { return <div className="detail-meta">{children}</div> }

export function ContentText({ children }: { children: React.ReactNode }) { return <div className="article-body">{children}</div> }

export function PageBody({ children }: { children: React.ReactNode }) { return <main className="container">{children}</main> }

export function PublicTitle({ title }: { title: string }) { return <h1>{title}</h1> }

export function AdminContentLink() { return <AdminLink href="/admin/content">Manage content</AdminLink> }

export function SiteContactLink() { return <ContactLink /> }

export function PublicRoute({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function RouteBody({ children }: { children: React.ReactNode }) { return <main className="container detail-page">{children}</main> }

export function PublicHeader({ title }: { title: string }) { return <PageTitle title={title} description={institution.description} /> }

export function FooterLinks() { return <LinkList links={institution ? [{ href: '/about', label: 'About' }, { href: '/contact', label: 'Contact' }] : []} /> }

export function DetailRoute({ title, backHref }: { title: string; backHref: string }) { return <DetailPage title={title} eyebrow="Official information" backHref={backHref} /> }

export function CmsRoute() { return <AdminNotice /> }

export function PublicRouteFooter() { return <PageFooter /> }

export function InstitutionInfo() { return <ContactInfo /> }

export function RouteNote() { return <DataNotice /> }

export function PublicPage({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function DetailCard({ title, text }: { title: string; text: string }) { return <div className="detail-callout"><strong>{title}</strong><span>{text}</span></div> }

export function BackTo({ href, label }: { href: string; label: string }) { return <BackLink href={href}>{label}</BackLink> }

export function PlaceholderPage({ title }: { title: string }) { return <SimplePage title={title} description={institution.description} /> }

export function PublicNavigationNote() { return <DataNotice /> }

export function PageEndNote() { return <DataNotice /> }

export function ContactDetailsList() { return <ContactInfo /> }

export function SiteConfigNote() { return <DataNotice /> }

export function PublicArticle({ title, body }: { title: string; body: string }) { return <DetailPage title={title} eyebrow="Public information" body={body} backHref="/news" /> }

export function PageLink({ href, label }: { href: string; label: string }) { return <ContentLink href={href}>{label}</ContentLink> }

export function RouteLinks() { return <FooterLinks /> }

export function SystemNote() { return <AdminNotice /> }

export function DetailInfo({ children }: { children: React.ReactNode }) { return <div className="detail-body">{children}</div> }

export function PublicSearchNote() { return <SearchHint /> }

export function PageContact() { return <ContactInfo /> }

export function InstitutionFooter() { return <SiteFooter /> }

export function RouteNotice() { return <DataNotice /> }

export function DetailPanel({ children }: { children: React.ReactNode }) { return <div className="detail-callout">{children}</div> }

export function SiteMark() { return <SiteIdentity /> }

export function ContentPanel({ children }: { children: React.ReactNode }) { return <Panel>{children}</Panel> }

export function DynamicPage({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function AdminPage({ title }: { title: string }) { return <PlaceholderPage title={title} /> }

export function PublicPageNote() { return <DataNotice /> }

export function PageSummary({ children }: { children: React.ReactNode }) { return <RouteDescription>{children}</RouteDescription> }

export function PublicContent() { return <DataNotice /> }

export function SiteFooterNote() { return <LegalNote /> }

export function RouteTitleBlock({ title, description }: { title: string; description: string }) { return <PageTitle title={title} description={description} /> }

export function CmsPlaceholder() { return <AdminNotice /> }

export function ResourceAction() { return <DocumentAction /> }

export function AboutContact() { return <ContactCard /> }

export function DefaultNotFound() { return <NotFoundState /> }

export function PublicDetail({ title, summary, backHref }: { title: string; summary?: string; backHref: string }) { return <DetailPage title={title} eyebrow="Official information" summary={summary} backHref={backHref} /> }

export function PublicListingNote() { return <DataNotice /> }

export function AdminRoute({ title }: { title: string }) { return <AdminPage title={title} /> }

export function DetailBack({ href }: { href: string }) { return <PageBack href={href} /> }

export function SiteContactInfo() { return <ContactInfo /> }

export function PublicMetaNote() { return <LegalNote /> }

export function EndPage() { return null }

export function InstitutionContact() { return <ContactInfo /> }

export function CmsInfo() { return <AdminNotice /> }

export function DetailListItems({ items }: { items: string[] }) { return <DetailList items={items} /> }

export function AdminSettingsNote() { return <AdminNotice /> }

export function ResourceInfo({ title, meta }: { title: string; meta: string }) { return <DocumentCard href="/resources" title={title} meta={meta} /> }

export function PublicSummary({ children }: { children: React.ReactNode }) { return <RouteDescription>{children}</RouteDescription> }

export function ContactInfoBlock() { return <ContactInfo /> }

export function PublicRouteHeader({ title }: { title: string }) { return <PageTitle title={title} description={institution.description} /> }

export function SearchResultCard({ href, title, text }: { href: string; title: string; text: string }) { return <SearchResult href={href} title={title} text={text} /> }

export function CmsPage() { return <AdminNotice /> }

export function DocumentMeta({ meta }: { meta: string }) { return <ResourceMeta meta={meta} /> }

export function ContactUs() { return <ContactLink /> }

export function PublicInformation() { return <DataNotice /> }

export function PageContent({ children }: { children: React.ReactNode }) { return <main className="container">{children}</main> }

export function DynamicRoute({ title, backHref }: { title: string; backHref: string }) { return <DynamicPage title={title} backHref={backHref} /> }

export function CmsAdminNotice() { return <AdminNotice /> }

export function PageMeta({ children }: { children: React.ReactNode }) { return <div className="detail-meta">{children}</div> }

export function DocumentDownloadNote() { return <DataNotice /> }

export function PublicDetailCard({ title, href }: { title: string; href: string }) { return <RouteCard href={href} title={title} /> }

export function InstitutionCard() { return <ContactCard /> }

export function LastNote() { return <DataNotice /> }

export function UniversalNotFound() { return <NotFoundState /> }

export function PublicRouteCardGrid({ children }: { children: React.ReactNode }) { return <CardGrid>{children}</CardGrid> }

export function PublicRouteMeta({ values }: { values: string[] }) { return <MetadataList values={values} /> }

export function PlatformOnly() { return <AdminNotice /> }

export function GenericDetail({ title, backHref }: { title: string; backHref: string }) { return <SimpleDetail title={title} backHref={backHref} /> }

export function PublicInstitution() { return <InstitutionalName /> }

export function RouteDetail({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function CmsDashboardNote() { return <AdminNotice /> }

export function PublicRouteDetail({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function ContactBlock() { return <ContactInfo /> }

export function PublicBody({ children }: { children: React.ReactNode }) { return <main className="container">{children}</main> }

export function AdminOnly() { return <AdminNotice /> }

export function RouteSummary({ children }: { children: React.ReactNode }) { return <RouteDescription>{children}</RouteDescription> }

export function PublicPageInfo() { return <DataNotice /> }

export function EmptyMessage() { return <EmptyResults /> }

export function SimpleRoute({ title, backHref }: { title: string; backHref: string }) { return <SimpleDetail title={title} backHref={backHref} /> }

export function PublicResourceDetail({ title, meta }: { title: string; meta: string }) { return <ResourceDetail title={title} category="Resource" meta={meta} /> }

export function CmsRouteInfo() { return <AdminNotice /> }

export function ContentRoute() { return <DataNotice /> }

export function PublicOffice() { return <InstitutionalName /> }

export function DetailPageNote() { return <DataNotice /> }

export function WebsiteNote() { return <DataNotice /> }

export function ContactPageInfo() { return <ContactInfo /> }

export function RouteCardNote() { return <DataNotice /> }

export function GenericPage({ title, description }: { title: string; description: string }) { return <SimplePage title={title} description={description} /> }

export function PublicRouteInfo() { return <DataNotice /> }

export function AdminRouteInfo() { return <AdminNotice /> }

export function Details({ children }: { children: React.ReactNode }) { return <div className="detail-body">{children}</div> }

export function PublicContactCard() { return <ContactCard /> }

export function PageContentNote() { return <DataNotice /> }

export function RoutePlaceholder({ title }: { title: string }) { return <PlaceholderPage title={title} /> }

export function OfficialInfo() { return <OfficialLabel /> }

export function PublicRouteEnd() { return null }

export function CmsPlaceholderPage({ title }: { title: string }) { return <AdminPage title={title} /> }

export function PublicListing() { return <DataNotice /> }

export function PublicDetailHeader({ title }: { title: string }) { return <PublicHeader title={title} /> }

export function SiteInformation() { return <SiteDescription /> }

export function PublicRouteBody({ children }: { children: React.ReactNode }) { return <main className="container">{children}</main> }

export function AdministrationNote() { return <AdminNotice /> }

export function ContentFooterNote() { return <DataNotice /> }

export function ContactRouteLink() { return <ContactLink /> }

export function DetailRouteNote() { return <DataNotice /> }

export function SiteIdentityBlock() { return <ContactCard /> }

export function PublicEnd() { return null }

export function AdminEnd() { return null }

export function GenericRoute({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function PublicDetailBody({ body }: { body: string }) { return <ArticleBody paragraphs={[body]} /> }

export function ContentRouteNote() { return <DataNotice /> }

export function ContactRouteInfo() { return <ContactInfo /> }

export function InstitutionName() { return <>{institution.name}</> }

export function PublicPageHeader({ title, description }: { title: string; description: string }) { return <PageTitle title={title} description={description} /> }

export function CmsRoutePlaceholder({ title }: { title: string }) { return <AdminPage title={title} /> }

export function PageEmpty() { return <EmptyResults /> }

export function RouteDetailPage({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function SiteInfo() { return <ContactInfo /> }

export function PublicPageFooter() { return <PageFooter /> }

export function DynamicDetail({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function RouteEmpty() { return <EmptyResults /> }

export function CmsNotice() { return <AdminNotice /> }

export function PublicPageNoteBlock() { return <DataNotice /> }

export function PageLinkCard({ href, title }: { href: string; title: string }) { return <RouteCard href={href} title={title} /> }

export function DetailLinkCard({ href, title }: { href: string; title: string }) { return <RouteCard href={href} title={title} /> }

export function OfficeContact() { return <ContactInfo /> }

export function PublicRouteShell({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function CmsRouteShell({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function PageContentBlock({ children }: { children: React.ReactNode }) { return <div className="detail-body">{children}</div> }

export function PublicContentBlock({ children }: { children: React.ReactNode }) { return <div className="article-body">{children}</div> }

export function SiteContactBlock() { return <ContactInfo /> }

export function RouteSummaryText({ children }: { children: React.ReactNode }) { return <p className="detail-summary">{children}</p> }

export function AdminScreen({ title }: { title: string }) { return <AdminPage title={title} /> }

export function PublicScreen({ title }: { title: string }) { return <SimplePage title={title} description={institution.description} /> }

export function DetailScreen({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function FinalPlaceholder() { return <AdminNotice /> }

export function PublicLabel() { return <OfficialLabel /> }

export function RouteHeading({ title }: { title: string }) { return <RouteTitle title={title} /> }

export function GovernmentInfo() { return <DataNotice /> }

export function PageInfo() { return <DataNotice /> }

export function CmsLabel() { return <AdminLabel /> }

export function PageDescription({ children }: { children: React.ReactNode }) { return <p>{children}</p> }

export function RouteInfo() { return <DataNotice /> }

export function PublicContentNote() { return <DataNotice /> }

export function AdminContentPlaceholder() { return <AdminNotice /> }

export function PageRoute({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function PublicRouteContent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function CmsRouteContent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function SiteRoute() { return <InstitutionalName /> }

export function PublicRoutePage({ title }: { title: string }) { return <PlaceholderPage title={title} /> }

export function AdminRoutePage({ title }: { title: string }) { return <AdminPage title={title} /> }

export function DetailRouteContent({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function ContactRoutePage() { return <ContactInfo /> }

export function PageRouteNote() { return <DataNotice /> }

export function PublicRouteNotice() { return <DataNotice /> }

export function AdminRouteNotice() { return <AdminNotice /> }

export function SiteRouteNotice() { return <DataNotice /> }

export function RouteEnd() { return null }

export function RoutePageEnd() { return null }

export function RouteComponent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function PublicComponent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function AdminComponent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function DetailComponent({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function ContactComponent() { return <ContactInfo /> }

export function FooterComponent() { return <PageFooter /> }

export function RouteComponentNote() { return <DataNotice /> }

export function FinalComponent() { return null }

export function AdminInstitution() { return <InstitutionalName /> }

export function SharedInstitution() { return <InstitutionalName /> }

export function SharedContact() { return <ContactInfo /> }

export function SharedNote() { return <DataNotice /> }

export function SharedEmpty() { return <EmptyResults /> }

export function SharedBack({ href }: { href: string }) { return <PageBack href={href} /> }

export function SharedDetail({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function SharedCard({ href, title }: { href: string; title: string }) { return <RouteCard href={href} title={title} /> }

export function SharedPage({ title }: { title: string }) { return <PlaceholderPage title={title} /> }

export function SharedAdmin({ title }: { title: string }) { return <AdminPage title={title} /> }

export function SharedFooter() { return <PageFooter /> }

export function SharedEnd() { return null }

export function SharedMeta() { return <DataNotice /> }

export function SharedHeader({ title }: { title: string }) { return <PublicHeader title={title} /> }

export function SharedBody({ children }: { children: React.ReactNode }) { return <main className="container">{children}</main> }

export function SharedRoute({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function SharedRoutePage({ title }: { title: string }) { return <PlaceholderPage title={title} /> }

export function SharedRouteDetail({ title, backHref }: { title: string; backHref: string }) { return <DetailRoute title={title} backHref={backHref} /> }

export function SharedRouteNote() { return <DataNotice /> }

export function SharedRouteEnd() { return null }

export function SharedRouteContact() { return <ContactInfo /> }

export function SharedRouteFooter() { return <PageFooter /> }

export function SharedRouteCard({ href, title }: { href: string; title: string }) { return <RouteCard href={href} title={title} /> }

export function SharedRouteEmpty() { return <EmptyResults /> }

export function SharedRouteAdmin({ title }: { title: string }) { return <AdminPage title={title} /> }

export function SharedRouteHeader({ title }: { title: string }) { return <PublicHeader title={title} /> }

export function SharedRouteBody({ children }: { children: React.ReactNode }) { return <main className="container">{children}</main> }

export function SharedRouteComponent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function SharedRouteContent({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function SharedRouteShell({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function SharedRouteInfo() { return <DataNotice /> }

export function SharedRouteMeta() { return <DataNotice /> }

export function SharedRouteLink({ href, label }: { href: string; label: string }) { return <DetailLink href={href} label={label} /> }

export function SharedRouteTitle({ title }: { title: string }) { return <h1>{title}</h1> }

export function SharedRouteSummary({ children }: { children: React.ReactNode }) { return <p className="detail-summary">{children}</p> }

export function SharedRoutePanel({ children }: { children: React.ReactNode }) { return <Panel>{children}</Panel> }

export function SharedRouteNotice() { return <DataNotice /> }

export function SharedRouteLabel() { return <OfficialLabel /> }

export function SharedRouteContactCard() { return <ContactCard /> }

export function SharedRouteDocument({ title, href }: { title: string; href: string }) { return <PublicDocument href={href} title={title} /> }

export function SharedRouteService({ title, href }: { title: string; href: string }) { return <PublicService href={href} title={title} /> }

export function SharedRouteNews({ title, href }: { title: string; href: string }) { return <PublicNews href={href} title={title} /> }

export function SharedRouteEvent({ title, href }: { title: string; href: string }) { return <PublicEvent href={href} title={title} /> }

export function SharedRouteDepartment({ title, href }: { title: string; href: string }) { return <PublicDepartment href={href} title={title} /> }

export function SharedRouteLeader({ title, href }: { title: string; href: string }) { return <PublicLeader href={href} title={title} /> }

export function SharedRouteResource({ title, href }: { title: string; href: string }) { return <PublicResource href={href} title={title} /> }

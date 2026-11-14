import { useEffect, useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { ApiClientError, pagesApi, type ContentStatus } from '../../lib/api-client'
import { ImageField } from '../../components/cms/ImageField'
import {
  DEFAULT_PLAN_CONTENT,
  PLAN_SECTION_IDS,
  parsePlanContent,
  serializePlanContent,
  type PlanContent,
  type PlanSectionId,
} from '../../lib/plan-content'
import { useT } from '../../lib/i18n'
import { siteTemplate } from '../../lib/site-template'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'

const SECTION_LABEL: Record<PlanSectionId, 'sectionArrive' | 'sectionAround' | 'sectionSeason' | 'sectionRespect' | 'sectionHyena'> = {
  arrive: 'sectionArrive',
  around: 'sectionAround',
  season: 'sectionSeason',
  respect: 'sectionRespect',
  hyena: 'sectionHyena',
}

const SECTION_HINT: Record<PlanSectionId, 'hintArrive' | 'hintAround' | 'hintSeason' | 'hintRespect' | 'hintHyena'> = {
  arrive: 'hintArrive',
  around: 'hintAround',
  season: 'hintSeason',
  respect: 'hintRespect',
  hyena: 'hintHyena',
}

export function CmsPlanEditPage() {
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.pages')
  const tCommon = useT('cms.common')
  const tStatus = useT('cms.status')
  const [pageId, setPageId] = useState<string | null>(null)
  const [content, setContent] = useState<PlanContent>(DEFAULT_PLAN_CONTENT)
  const [status, setStatus] = useState<ContentStatus>('published')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(formatDocumentTitle(t('planEditTitle'), officeName))

  useEffect(() => {
    let cancelled = false
    pagesApi
      .cmsList()
      .then(async (items) => {
        const row = items.find((p) => p.slug === 'plan')
        if (!row) throw new Error(t('planMissing'))
        const full = await pagesApi.cmsById(row.id)
        if (cancelled) return
        setPageId(full.id)
        setContent(parsePlanContent(full.content))
        setStatus(full.status)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [t])

  function setTitle(title: string) {
    setContent((c) => ({ ...c, title }))
  }

  function patchSection(id: PlanSectionId, patch: { title?: string; body?: string; image?: string }) {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canWrite || !pageId) return
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      await pagesApi.cmsUpdate(pageId, {
        title: content.title.trim() || 'Plan your visit',
        slug: 'plan',
        content: serializePlanContent(content),
        status,
      })
      setSuccess(tCommon('changesSaved'))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <div className="cms-pages">
        <p className="cms-muted">{tCommon('loading')}</p>
      </div>
    )
  }

  if (error && !pageId) {
    return (
      <div className="cms-pages">
        <p className="cms-form-error">{error}</p>
        <Link to="/cms/content">{t('backToPages')}</Link>
      </div>
    )
  }

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('listTitle')}</span>
          <h1>{t('planEditTitle')}</h1>
          <p>{t('planEditIntro')}</p>
        </div>
        <div className="cms-pages-header-actions">
          <a href="/plan" target="_blank" rel="noreferrer">
            {tCommon('viewOnWebsite')}
          </a>
          <Link to="/cms/content">{t('backToPages')}</Link>
        </div>
      </header>

      {!canWrite ? (
        <div className="cms-page-form cms-page-viewer">
          <p>
            <strong>{content.title}</strong>
          </p>
          {content.sections.map((s) => (
            <label key={s.id}>
              {s.title}
              {s.image ? (
                <p>
                  <img src={s.image} alt="" style={{ maxWidth: 220, borderRadius: 4 }} />
                </p>
              ) : null}
              <p style={{ whiteSpace: 'pre-wrap' }}>{s.body || tCommon('emptyDash')}</p>
            </label>
          ))}
          <p className="cms-muted">{tCommon('viewerCannotEdit')}</p>
        </div>
      ) : (
        <form className="cms-page-form" onSubmit={onSubmit}>
          <section className="cms-form-section">
            <label>
              {tCommon('title')}
              <span className="cms-field-req">{tCommon('required')}</span>
              <input
                type="text"
                value={content.title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label>
              {tCommon('status')}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
              >
                {(['draft', 'published', 'archived'] as const).map((opt) => (
                  <option key={opt} value={opt} disabled={opt === 'archived'}>
                    {tStatus(opt)}
                  </option>
                ))}
              </select>
              <span className="cms-field-hint">{t('guideNoArchive')}</span>
            </label>
          </section>

          {PLAN_SECTION_IDS.map((id) => {
            const section = content.sections.find((s) => s.id === id)!
            return (
              <section key={id} className="cms-form-section">
                <h2 className="cms-kicker" style={{ marginBottom: 8 }}>
                  {t(SECTION_LABEL[id])}
                </h2>
                <label>
                  {t('sectionHeading')}
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => patchSection(id, { title: e.target.value })}
                  />
                </label>
                <ImageField
                  label={tCommon('coverImage')}
                  value={section.image}
                  onChange={(url) => patchSection(id, { image: url })}
                  disabled={pending}
                />
                <label>
                  {t('sectionBody')}
                  <textarea
                    rows={5}
                    value={section.body}
                    onChange={(e) => patchSection(id, { body: e.target.value })}
                  />
                  <span className="cms-field-hint">{t(SECTION_HINT[id])}</span>
                </label>
              </section>
            )
          })}

          {error ? (
            <p className="cms-form-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? <p className="cms-form-success">{success}</p> : null}

          <div className="cms-form-footer">
            <button className="cms-primary" type="submit" disabled={pending}>
              {pending ? tCommon('saving') : tCommon('saveChanges')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

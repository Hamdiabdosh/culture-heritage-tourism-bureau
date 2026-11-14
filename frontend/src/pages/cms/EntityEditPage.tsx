import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { ApiClientError } from '../../lib/api-client'
import { isGuideSlug, publicPathForGuideSlug } from '../../lib/guide-pages'
import { useT } from '../../lib/i18n'
import { normalizeSlug } from '../../lib/slug'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'
import { siteTemplate } from '../../lib/site-template'
import { ImageField } from '../../components/cms/ImageField'
import { entities, type EntityKey, type Field } from './entityConfig'

const msgNs: Record<EntityKey, string> = {
  pages: 'cms.pages',
  events: 'cms.events',
  services: 'cms.services',
  documents: 'cms.documents',
}

const backKey: Record<EntityKey, string> = {
  pages: 'backToPages',
  events: 'backToEvents',
  services: 'backToServices',
  documents: 'backToDocuments',
}

const archiveConfirmKey: Record<EntityKey, string> = {
  pages: 'archiveConfirm',
  events: 'archiveConfirm',
  services: 'archiveConfirm',
  documents: 'archiveConfirm',
}

const archiveButtonKey: Record<EntityKey, string> = {
  pages: 'archiveButton',
  events: 'archiveButton',
  services: 'archiveButton',
  documents: 'archiveButton',
}

export function CmsEntityEditPage({
  entityKey,
  mode,
}: {
  entityKey: EntityKey
  mode: 'create' | 'edit'
}) {
  const cfg = entities[entityKey]
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT(msgNs[entityKey])
  const tCommon = useT('cms.common')
  const tStatus = useT('cms.status')
  const [values, setValues] = useState<Record<string, string>>(cfg.empty)
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [loading, setLoading] = useState(mode === 'edit')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  const pageTitle =
    mode === 'create'
      ? t('newTitle')
      : canWrite
        ? t('editTitle')
        : t('viewTitle')
  useDocumentTitle(formatDocumentTitle(pageTitle, officeName))

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    let cancelled = false
    cfg
      .get(id)
      .then((row) => {
        if (cancelled) return
        const next: Record<string, string> = { ...cfg.empty }
        for (const key of Object.keys(cfg.empty)) {
          next[key] = String((row as Record<string, string>)[key] ?? '')
        }
        setValues(next)
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
  }, [cfg, id, mode])

  useEffect(() => {
    if (!slugTouched && 'title' in values) {
      setValues((v) => ({ ...v, slug: normalizeSlug(v.title ?? '') }))
    }
  }, [values.title, slugTouched])

  function fieldLabel(field: Field): string {
    if (field.key === 'eventDate') return t('eventDate')
    if (field.key === 'responsibleOffice') return t('responsibleOffice')
    if (field.key === 'requiredDocuments') return t('requiredDocuments')
    if (field.key === 'process' && entityKey === 'services') return t('processSteps')
    const fromCommon: Record<string, string> = {
      title: tCommon('title'),
      slug: tCommon('slug'),
      status: tCommon('status'),
      summary: tCommon('summary'),
      content: tCommon('content'),
      description: tCommon('description'),
      category: tCommon('category'),
      location: tCommon('location'),
      type: tCommon('type'),
      year: tCommon('year'),
      icon: tCommon('icon'),
      contact: tCommon('contact'),
      process: tCommon('process'),
      eligibility: tCommon('eligibility'),
      coverImage: tCommon('coverImage'),
      fileUrl: tCommon('fileUrl'),
      fileType: tCommon('fileType'),
      fileSize: tCommon('fileSize'),
    }
    return fromCommon[field.key] ?? field.label
  }

  function fieldHint(field: Field): string | null {
    if (field.key === 'slug') {
      if (entityKey === 'pages' && isGuideSlug(values.slug ?? '')) {
        return t('slugLockedHint')
      }
      return t('slugHint')
    }
    if (field.key === 'content' && entityKey === 'pages') {
      if (values.slug === 'plan-itineraries') return t('contentHintItineraries')
    }
    if (field.kind === 'lines') {
      if (field.key === 'requiredDocuments') return t('oneItemPerLine')
      if (field.key === 'process') return t('oneStepPerLine')
      return tCommon('onePerLine')
    }
    return field.hint ?? null
  }

  // Freeform page creation is disabled — fixed guide slots only.
  if (entityKey === 'pages' && mode === 'create') {
    return <Navigate to="/cms/content" replace />
  }

  // Plan uses a dedicated structured editor.
  if (entityKey === 'pages' && mode === 'edit' && values.slug === 'plan') {
    return <Navigate to="/cms/content/plan" replace />
  }

  const guidePage = entityKey === 'pages' && isGuideSlug(values.slug ?? '')
  const guidePublicPath = publicPathForGuideSlug(values.slug ?? '')

  if (!canWrite && mode === 'create') {
    return (
      <div className="cms-pages">
        <p className="cms-form-error">{tCommon('editorsOnly')}</p>
        <Link to={`/cms/${cfg.route}`}>{t(backKey[entityKey])}</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cms-pages">
        <p className="cms-muted">{tCommon('loading')}</p>
      </div>
    )
  }

  if (error && mode === 'edit' && !values.title) {
    return (
      <div className="cms-pages">
        <p className="cms-form-error">{error}</p>
        <Link to={`/cms/${cfg.route}`}>{t(backKey[entityKey])}</Link>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canWrite) return
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      const body = cfg.toBody(values)
      if (mode === 'create') {
        const created = await cfg.create(body)
        navigate(`/cms/${cfg.route}/${created.id}`, { replace: true })
        return
      }
      await cfg.update(id, body)
      setSuccess(tCommon('changesSaved'))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
    } finally {
      setPending(false)
    }
  }

  async function onArchive() {
    if (!canWrite || !confirm(t(archiveConfirmKey[entityKey]))) return
    setPending(true)
    try {
      await cfg.archive(id)
      navigate(`/cms/${cfg.route}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
      setPending(false)
    }
  }

  function setField(key: string, value: string) {
    if (key === 'slug') setSlugTouched(true)
    setValues((v) => ({ ...v, [key]: value }))
  }

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{t('listTitle')}</span>
          <h1>{pageTitle}</h1>
        </div>
        <div className="cms-pages-header-actions">
          {guidePublicPath ? (
            <a href={guidePublicPath} target="_blank" rel="noreferrer">
              {tCommon('viewOnWebsite')}
            </a>
          ) : null}
          <Link to={`/cms/${cfg.route}`}>{t(backKey[entityKey])}</Link>
        </div>
      </header>

      {!canWrite ? (
        <div className="cms-page-form cms-page-viewer">
          {cfg.fields.map((field) => (
            <label key={field.key}>
              {fieldLabel(field)}
              <p>
                {field.key === 'status' ? (
                  <span className={`cms-status-pill ${values[field.key]}`}>
                    {tStatus(values[field.key] || 'draft')}
                  </span>
                ) : (
                  values[field.key] || tCommon('emptyDash')
                )}
              </p>
            </label>
          ))}
          <p className="cms-muted">{tCommon('viewerCannotEdit')}</p>
        </div>
      ) : (
        <form className="cms-page-form" onSubmit={onSubmit}>
          <section className="cms-form-section">
            {cfg.fields.map((field) => {
              const hint = fieldHint(field)
              if (field.kind === 'image') {
                return (
                  <ImageField
                    key={field.key}
                    label={fieldLabel(field)}
                    value={values[field.key] ?? ''}
                    onChange={(url) => setField(field.key, url)}
                    optional={!field.required}
                    disabled={pending}
                  />
                )
              }
              return (
                <label key={field.key}>
                  {fieldLabel(field)}
                  {field.required ? (
                    <span className="cms-field-req">{tCommon('required')}</span>
                  ) : (
                    <span className="cms-field-opt">{tCommon('optional')}</span>
                  )}
                  {field.kind === 'textarea' || field.kind === 'lines' ? (
                    <textarea
                      rows={field.kind === 'lines' ? 4 : (field.rows ?? 6)}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      required={field.required}
                    />
                  ) : field.kind === 'select' ? (
                    <select
                      value={values[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      required={field.required}
                    >
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {field.key === 'status' ? tStatus(opt) : opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.kind === 'datetime' ? 'datetime-local' : 'text'}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      required={field.required}
                      readOnly={guidePage && field.key === 'slug'}
                    />
                  )}
                  {field.key === 'slug' ? (
                    <span className="cms-field-hint">
                      {hint ??
                        `${tCommon('publicUrl')}: ${guidePublicPath ?? `${cfg.publicPrefix}${values.slug || '…'}`}`}
                    </span>
                  ) : hint ? (
                    <span className="cms-field-hint">{hint}</span>
                  ) : null}
                  {field.key === 'status' ? (
                    <span className="cms-field-hint">{tCommon('editorDraftForced')}</span>
                  ) : null}
                </label>
              )
            })}
          </section>

          {error ? (
            <p className="cms-form-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? <p className="cms-form-success">{success}</p> : null}

          <div className="cms-form-footer">
            <div className="cms-form-actions">
              <button className="cms-primary" type="submit" disabled={pending}>
                {pending
                  ? mode === 'create'
                    ? tCommon('creating')
                    : tCommon('saving')
                  : mode === 'create'
                    ? tCommon('create')
                    : tCommon('saveChanges')}
              </button>
              {mode === 'edit' && !guidePage ? (
                <button type="button" className="cms-danger" disabled={pending} onClick={onArchive}>
                  {t(archiveButtonKey[entityKey])}
                </button>
              ) : null}
              {mode === 'edit' && guidePage ? (
                <p className="cms-muted" style={{ margin: 0 }}>
                  {t('guideNoArchive')}
                </p>
              ) : null}
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

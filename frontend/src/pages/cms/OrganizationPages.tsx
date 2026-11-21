import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import {
  ApiClientError,
  departmentsApi,
  peopleApi,
  type CmsDepartment,
  type CmsPerson,
  type ContentStatus,
  type TranslationLang,
  type TranslationMap,
} from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { normalizeSlug } from '../../lib/slug'
import { siteTemplate } from '../../lib/site-template'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'

export type OrgKind = 'departments' | 'people'

type Field = {
  key: string
  kind: 'text' | 'textarea' | 'number' | 'email' | 'tel'
  required?: boolean
  rows?: number
  maxLength?: number
}

const LANGS: TranslationLang[] = ['am', 'om', 'ha']

const CONFIG = {
  departments: {
    nameKey: 'name',
    fields: [
      { key: 'name', kind: 'text', required: true, maxLength: 255 },
      { key: 'slug', kind: 'text', required: true, maxLength: 255 },
      { key: 'summary', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'description', kind: 'textarea', rows: 8, maxLength: 20000 },
      { key: 'sortOrder', kind: 'number' },
    ] as Field[],
    translatable: [
      { key: 'name', kind: 'text', maxLength: 255 },
      { key: 'summary', kind: 'textarea', rows: 3, maxLength: 2000 },
      { key: 'description', kind: 'textarea', rows: 5, maxLength: 20000 },
    ] as Field[],
    empty: { name: '', slug: '', summary: '', description: '', sortOrder: '0' },
  },
  people: {
    nameKey: 'fullName',
    fields: [
      { key: 'fullName', kind: 'text', required: true, maxLength: 255 },
      { key: 'slug', kind: 'text', required: true, maxLength: 255 },
      { key: 'title', kind: 'text', required: true, maxLength: 255 },
      { key: 'bio', kind: 'textarea', rows: 8, maxLength: 20000 },
      { key: 'email', kind: 'email', maxLength: 255 },
      { key: 'phone', kind: 'tel', maxLength: 64 },
      { key: 'sortOrder', kind: 'number' },
    ] as Field[],
    translatable: [
      { key: 'title', kind: 'text', maxLength: 255 },
      { key: 'bio', kind: 'textarea', rows: 5, maxLength: 20000 },
    ] as Field[],
    empty: { fullName: '', slug: '', title: '', bio: '', email: '', phone: '', sortOrder: '0' },
  },
} as const

type TrState = Record<TranslationLang, Record<string, string>>

function emptyTr(): TrState {
  return { am: {}, om: {}, ha: {} }
}

function errorMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : (err as Error).message
}

export function CmsOrgListPage({ kind }: { kind: OrgKind }) {
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.org')
  const tCommon = useT('cms.common')
  const tStatus = useT('cms.status')
  const tNav = useT('cms.navigation')
  const [departments, setDepartments] = useState<CmsDepartment[] | null>(null)
  const [people, setPeople] = useState<CmsPerson[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prefix = kind === 'departments' ? 'departments' : 'people'

  function load() {
    setError(null)
    setDepartments(null)
    setPeople(null)
    // People rows show department names, so departments load for both lists.
    Promise.all([departmentsApi.cmsList(), kind === 'people' ? peopleApi.cmsList() : Promise.resolve([])])
      .then(([d, p]) => {
        setDepartments(d)
        setPeople(p)
      })
      .catch((err: unknown) => {
        setDepartments([])
        setPeople([])
        setError(errorMessage(err))
      })
  }

  useEffect(load, [kind])

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(formatDocumentTitle(t(`${prefix}Title`), officeName))

  const rows = kind === 'departments' ? departments : people
  const loading = rows === null && !error
  const deptName = (id: string | null) => departments?.find((d) => d.id === id)?.name ?? tCommon('emptyDash')

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tNav('organization')}</span>
          <h1>{t(`${prefix}Title`)}</h1>
          <p>{rows ? tCommon('itemsCount', { count: rows.length }) : t(`${prefix}Intro`)}</p>
        </div>
        <div className="cms-pages-header-actions">
          {canWrite ? (
            <Link className="cms-primary" to={`/cms/${kind}/new`}>
              {t(kind === 'departments' ? 'newDepartment' : 'newPerson')}
            </Link>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="cms-empty cms-panel" role="alert">
          <h2>{tCommon('loadError')}</h2>
          <p>{error}</p>
          <button type="button" className="cms-primary" onClick={load}>
            {tCommon('tryAgain')}
          </button>
        </div>
      ) : null}

      {loading ? <p className="cms-muted">{tCommon('loading')}</p> : null}

      {rows && rows.length === 0 && !error ? (
        <div className="cms-empty cms-panel">
          <h2>{t(`${prefix}EmptyTitle`)}</h2>
          <p>{canWrite ? t(`${prefix}EmptyEditor`) : t(`${prefix}EmptyViewer`)}</p>
        </div>
      ) : null}

      {rows && rows.length > 0 ? (
        <div className="cms-panel cms-pages-table-wrap">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>{kind === 'departments' ? t('name') : t('fullName')}</th>
                  {kind === 'people' ? <th>{t('department')}</th> : <th>{tCommon('slug')}</th>}
                  <th>{t('sortOrder')}</th>
                  <th>{tCommon('status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {kind === 'departments'
                  ? departments!.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <Link className="cms-row-title" to={`/cms/departments/${d.id}`}>
                            <strong>{d.name}</strong>
                          </Link>
                        </td>
                        <td>
                          <code>{d.slug}</code>
                        </td>
                        <td>{d.sortOrder}</td>
                        <td>
                          <span className={`cms-status-pill ${d.status}`}>{tStatus(d.status)}</span>
                        </td>
                        <td>
                          <Link className="cms-row-action" to={`/cms/departments/${d.id}`}>
                            {canWrite ? tCommon('edit') : tCommon('view')}
                          </Link>
                        </td>
                      </tr>
                    ))
                  : people!.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link className="cms-row-title" to={`/cms/people/${p.id}`}>
                            <strong>{p.fullName}</strong>
                          </Link>
                          <small className="cms-row-meta">
                            {p.title} · {p.isLeadership ? t('leadershipBadge') : t('staffBadge')}
                          </small>
                        </td>
                        <td>{deptName(p.departmentId)}</td>
                        <td>{p.sortOrder}</td>
                        <td>
                          <span className={`cms-status-pill ${p.status}`}>{tStatus(p.status)}</span>
                        </td>
                        <td>
                          <Link className="cms-row-action" to={`/cms/people/${p.id}`}>
                            {canWrite ? tCommon('edit') : tCommon('view')}
                          </Link>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CmsOrgEditPage({ kind, mode }: { kind: OrgKind; mode: 'create' | 'edit' }) {
  const cfg = CONFIG[kind]
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.org')
  const tCommon = useT('cms.common')
  const tStatus = useT('cms.status')
  const [values, setValues] = useState<Record<string, string>>({ ...cfg.empty })
  const [status, setStatus] = useState<ContentStatus>('draft')
  const [isLeadership, setIsLeadership] = useState(true)
  const [departmentId, setDepartmentId] = useState('')
  const [tr, setTr] = useState<TrState>(emptyTr)
  const [departments, setDepartments] = useState<CmsDepartment[]>([])
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [loading, setLoading] = useState(mode === 'edit')
  const [loadFailed, setLoadFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const prefix = kind === 'departments' ? 'Department' : 'Person'
  const pageTitle =
    mode === 'create' ? t(`new${prefix}`) : canWrite ? t(`edit${prefix}`) : t(`view${prefix}`)
  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(formatDocumentTitle(pageTitle, officeName))

  useEffect(() => {
    if (kind !== 'people') return
    departmentsApi
      .cmsList()
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [kind])

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    let cancelled = false
    const api = kind === 'departments' ? departmentsApi : peopleApi
    api
      .cmsById(id)
      .then((row) => {
        if (cancelled) return
        const record = row as unknown as Record<string, unknown>
        const next: Record<string, string> = {}
        for (const key of Object.keys(cfg.empty)) next[key] = String(record[key] ?? '')
        setValues(next)
        setStatus(row.status)
        const nextTr = emptyTr()
        for (const lang of LANGS) nextTr[lang] = { ...(row.translations?.[lang] ?? {}) }
        setTr(nextTr)
        if (kind === 'people') {
          const p = row as CmsPerson
          setIsLeadership(p.isLeadership)
          setDepartmentId(p.departmentId ?? '')
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(errorMessage(err))
        setLoadFailed(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cfg, id, kind, mode])

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function setField(key: string, value: string) {
    setDirty(true)
    setSuccess(null)
    if (key === 'slug') setSlugTouched(true)
    setValues((v) => {
      const next = { ...v, [key]: value }
      if (key === cfg.nameKey && !slugTouched) next.slug = normalizeSlug(value)
      return next
    })
  }

  function setTrField(lang: TranslationLang, key: string, value: string) {
    setDirty(true)
    setSuccess(null)
    setTr((prev) => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }))
  }

  function buildTranslations(): TranslationMap {
    const out: TranslationMap = {}
    for (const lang of LANGS) {
      const entry: Record<string, string> = {}
      for (const f of cfg.translatable) {
        const v = (tr[lang][f.key] ?? '').trim()
        if (v) entry[f.key] = v
      }
      if (Object.keys(entry).length) out[lang] = entry
    }
    return out
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canWrite) return
    setPending(true)
    setError(null)
    setSuccess(null)
    const sortOrder = Number.parseInt(values.sortOrder || '0', 10) || 0
    const translations = buildTranslations()
    try {
      let saved: CmsDepartment | CmsPerson
      if (kind === 'departments') {
        const body = {
          name: values.name,
          slug: values.slug,
          summary: values.summary,
          description: values.description,
          sortOrder,
          status,
          translations,
        }
        saved = mode === 'create' ? await departmentsApi.cmsCreate(body) : await departmentsApi.cmsUpdate(id, body)
      } else {
        const body = {
          fullName: values.fullName,
          slug: values.slug,
          title: values.title,
          bio: values.bio,
          email: values.email,
          phone: values.phone,
          departmentId: departmentId || null,
          sortOrder,
          isLeadership,
          status,
          translations,
        }
        saved = mode === 'create' ? await peopleApi.cmsCreate(body) : await peopleApi.cmsUpdate(id, body)
      }
      setDirty(false)
      if (mode === 'create') {
        navigate(`/cms/${kind}/${saved.id}`, { replace: true })
        return
      }
      setStatus(saved.status)
      setValues((v) => ({ ...v, slug: saved.slug }))
      setSuccess(
        status === 'published' && saved.status !== 'published'
          ? `${tCommon('changesSaved')} ${tCommon('editorDraftForced')}`
          : tCommon('changesSaved'),
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function onArchive() {
    if (!canWrite || !confirm(t(`archive${prefix}Confirm`))) return
    setPending(true)
    setError(null)
    try {
      await (kind === 'departments' ? departmentsApi.cmsArchive(id) : peopleApi.cmsArchive(id))
      setDirty(false)
      navigate(`/cms/${kind}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setPending(false)
    }
  }

  const backLink = (
    <Link to={`/cms/${kind}`}>{t(kind === 'departments' ? 'backToDepartments' : 'backToPeople')}</Link>
  )

  if (!canWrite && mode === 'create') {
    return (
      <div className="cms-pages">
        <p className="cms-form-error">{tCommon('editorsOnly')}</p>
        {backLink}
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
  if (loadFailed) {
    return (
      <div className="cms-pages">
        <p className="cms-form-error" role="alert">
          {error}
        </p>
        {backLink}
      </div>
    )
  }

  function renderInput(field: Field, value: string, onChange: (v: string) => void, idSuffix = '') {
    const common = {
      id: `org-${field.key}${idSuffix}`,
      value,
      required: field.required,
      maxLength: field.maxLength,
    }
    if (field.kind === 'textarea') {
      return <textarea {...common} rows={field.rows ?? 4} onChange={(e) => onChange(e.target.value)} />
    }
    return (
      <input
        {...common}
        type={field.kind}
        step={field.kind === 'number' ? 1 : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  const selectableDepartments = departments.filter(
    (d) => d.status !== 'archived' || d.id === departmentId,
  )

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">
            {t(kind === 'departments' ? 'departmentsTitle' : 'peopleTitle')}
          </span>
          <h1>{pageTitle}</h1>
          <p>{t('verifiedOnlyHint')}</p>
        </div>
        <div className="cms-pages-header-actions">{backLink}</div>
      </header>

      <form className="cms-page-form" onSubmit={onSubmit}>
        <fieldset className="cms-org-fieldset" disabled={!canWrite || pending}>
          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionDetails')}</h2>
            {cfg.fields.map((field) => (
              <label key={field.key} htmlFor={`org-${field.key}`}>
                {t(field.key)}
                {field.required ? (
                  <span className="cms-field-req">{tCommon('required')}</span>
                ) : (
                  <span className="cms-field-opt">{tCommon('optional')}</span>
                )}
                {renderInput(field, values[field.key] ?? '', (v) => setField(field.key, v))}
                {field.key === 'slug' ? (
                  <span className="cms-field-hint">{t('slugHint')}</span>
                ) : field.key === 'sortOrder' ? (
                  <span className="cms-field-hint">{t('sortOrderHint')}</span>
                ) : null}
              </label>
            ))}

            {kind === 'people' ? (
              <>
                <label htmlFor="org-department">
                  {t('department')}
                  <span className="cms-field-opt">{tCommon('optional')}</span>
                  <select
                    id="org-department"
                    value={departmentId}
                    onChange={(e) => {
                      setDirty(true)
                      setDepartmentId(e.target.value)
                    }}
                  >
                    <option value="">{t('noDepartment')}</option>
                    {selectableDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d.status !== 'published' ? ` (${tStatus(d.status)})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cms-checkbox-row" htmlFor="org-leadership">
                  <input
                    id="org-leadership"
                    type="checkbox"
                    checked={isLeadership}
                    onChange={(e) => {
                      setDirty(true)
                      setIsLeadership(e.target.checked)
                    }}
                  />
                  <span>
                    {t('isLeadership')}
                    <span className="cms-field-hint">{t('isLeadershipHint')}</span>
                  </span>
                </label>
              </>
            ) : null}

            <label htmlFor="org-status">
              {tCommon('status')}
              <span className="cms-field-req">{tCommon('required')}</span>
              <select
                id="org-status"
                value={status}
                onChange={(e) => {
                  setDirty(true)
                  setStatus(e.target.value as ContentStatus)
                }}
              >
                {(['draft', 'published', 'archived'] as const).map((s) => (
                  <option key={s} value={s}>
                    {tStatus(s)}
                  </option>
                ))}
              </select>
              <span className="cms-field-hint">{tCommon('editorDraftForced')}</span>
            </label>
          </section>

          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionTranslations')}</h2>
            <p className="cms-muted">
              {t(kind === 'departments' ? 'translationsHintDepartments' : 'translationsHintPeople')}
            </p>
            {LANGS.map((lang) => (
              <fieldset key={lang} className="cms-fieldset">
                <legend>{t(`lang_${lang}`)}</legend>
                {cfg.translatable.map((field) => (
                  <label key={field.key} htmlFor={`org-${field.key}-${lang}`}>
                    {t(field.key)}
                    {renderInput(field, tr[lang][field.key] ?? '', (v) => setTrField(lang, field.key, v), `-${lang}`)}
                  </label>
                ))}
              </fieldset>
            ))}
          </section>
        </fieldset>

        {error ? (
          <p className="cms-form-error" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="cms-form-success" role="status">
            {success}
          </p>
        ) : null}
        {dirty ? <p className="cms-muted">{t('unsavedChanges')}</p> : null}

        {canWrite ? (
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
              {mode === 'edit' && status !== 'archived' ? (
                <button type="button" className="cms-danger" disabled={pending} onClick={onArchive}>
                  {t('archive')}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="cms-muted">{tCommon('viewerCannotEdit')}</p>
        )}
      </form>
    </div>
  )
}

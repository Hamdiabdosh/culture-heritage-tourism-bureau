import { useEffect, useState, type FormEvent } from 'react'
import { ApiClientError, type NewsInput } from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { normalizeSlug } from '../../lib/slug'
import { ImageField } from './ImageField'

type ContentStatus = NewsInput['status']

type Props = {
  mode: 'create' | 'edit'
  initial: NewsInput & { id?: string }
  canWrite: boolean
  onSubmit: (body: NewsInput) => Promise<void>
  onArchive?: () => Promise<void>
}

export function NewsEditorForm({ mode, initial, canWrite, onSubmit, onArchive }: Props) {
  const t = useT('cms.news')
  const tCommon = useT('cms.common')
  const tStatus = useT('cms.status')
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [summary, setSummary] = useState(initial.summary)
  const [category, setCategory] = useState(initial.category)
  const [coverImage, setCoverImage] = useState(initial.coverImage ?? '')
  const [content, setContent] = useState(initial.content)
  const [status, setStatus] = useState<ContentStatus>(initial.status)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!slugTouched) setSlug(normalizeSlug(title))
  }, [title, slugTouched])

  if (!canWrite) {
    return (
      <div className="cms-page-form cms-page-viewer">
        <section className="cms-form-section">
          <h2 className="cms-form-section-title">{tCommon('basicInformation')}</h2>
          <label>
            {tCommon('title')}
            <p>{initial.title}</p>
          </label>
          <label>
            {tCommon('publicUrl')}
            <p>
              <code>/stories/{initial.slug}</code>
            </p>
          </label>
          <label>
            {tCommon('status')}
            <p>
              <span className={`cms-status-pill ${initial.status}`}>{tStatus(initial.status)}</span>
            </p>
          </label>
        </section>
        <section className="cms-form-section">
          <h2 className="cms-form-section-title">{t('newsInformation')}</h2>
          <label>
            {tCommon('summary')}
            <p>{initial.summary || tCommon('emptyDash')}</p>
          </label>
          <label>
            {tCommon('category')}
            <p>{initial.category || tCommon('emptyDash')}</p>
          </label>
          <label>
            {tCommon('content')}
            <textarea readOnly rows={12} value={initial.content} />
          </label>
        </section>
        <p className="cms-muted">{tCommon('viewerCannotEdit')}</p>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      await onSubmit({ title, slug, summary, category, coverImage, content, status })
      setSuccess(mode === 'create' ? tCommon('articleCreated') : tCommon('changesSaved'))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
    } finally {
      setPending(false)
    }
  }

  async function handleArchive() {
    if (!onArchive || !confirm(t('archiveConfirm'))) return
    setPending(true)
    setError(null)
    try {
      await onArchive()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message)
      setPending(false)
    }
  }

  return (
    <form className="cms-page-form" onSubmit={handleSubmit}>
      <section className="cms-form-section" aria-labelledby="news-basic-heading">
        <h2 id="news-basic-heading" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>
        <label>
          {tCommon('title')} <span className="cms-field-req">{tCommon('required')}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          {tCommon('slug')} <span className="cms-field-req">{tCommon('required')}</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            required
          />
          <span className="cms-field-hint">{t('slugHint')}</span>
        </label>
        <label>
          {tCommon('status')} <span className="cms-field-req">{tCommon('required')}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
            <option value="draft">{tStatus('draft')}</option>
            <option value="published">{tStatus('published')}</option>
            <option value="archived">{tStatus('archived')}</option>
          </select>
          <span className="cms-field-hint cms-status-hints">
            <span>{tCommon('editorDraftForced')}</span>
          </span>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="news-info-heading">
        <h2 id="news-info-heading" className="cms-form-section-title">
          {t('newsInformation')}
        </h2>
        <label>
          {tCommon('summary')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          <span className="cms-field-hint">{t('summaryHint')}</span>
        </label>
        <label>
          {tCommon('category')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
          <span className="cms-field-hint">{t('categoryHint')}</span>
        </label>
        <ImageField
          label={tCommon('coverImage')}
          value={coverImage}
          onChange={setCoverImage}
          disabled={pending}
        />
        <label>
          {tCommon('content')} <span className="cms-field-req">{tCommon('required')}</span>
          <textarea rows={12} value={content} onChange={(e) => setContent(e.target.value)} required />
        </label>
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
                ? t('createArticle')
                : tCommon('saveChanges')}
          </button>
          {mode === 'edit' && onArchive ? (
            <button type="button" className="cms-danger" disabled={pending} onClick={handleArchive}>
              {t('archiveButton')}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  )
}

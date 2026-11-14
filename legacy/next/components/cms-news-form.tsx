'use client'

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { NewsActionState } from '@/app/cms/news/actions'
import { archiveNewsAction, createNewsAction, updateNewsAction } from '@/app/cms/news/actions'
import { normalizeSlug } from '@/lib/content/page-fields'

const initialState: NewsActionState = {}

type ContentStatus = 'draft' | 'published' | 'archived'

type NewsFormValues = {
  id?: string
  title: string
  slug: string
  summary: string
  category: string
  content: string
  status: ContentStatus
}

function StatusHints() {
  const tStatus = useTranslations('cms.status')
  return (
    <span className="cms-field-hint cms-status-hints">
      <span>{tStatus('hintDraft')}</span>
      <span>{tStatus('hintPublished')}</span>
      <span>{tStatus('hintArchived')}</span>
    </span>
  )
}

export function NewsEditorForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit'
  initial: NewsFormValues
}) {
  const t = useTranslations('cms.news')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')
  const action = mode === 'create' ? createNewsAction : updateNewsAction
  const [state, formAction, pending] = useActionState(action, initialState)
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [status, setStatus] = useState(initial.status)

  useEffect(() => {
    if (!slugTouched) {
      setSlug(normalizeSlug(title))
    }
  }, [title, slugTouched])

  return (
    <form action={formAction} className="cms-page-form">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <section className="cms-form-section" aria-labelledby="news-basic-heading">
        <h2 id="news-basic-heading" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>

        <label>
          {tCommon('title')} <span className="cms-field-req">{tCommon('required')}</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Public service update"
          />
        </label>

        <label>
          {tCommon('slug')} <span className="cms-field-req">{tCommon('required')}</span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            required
            placeholder="public-service-update"
          />
          <span className="cms-field-hint">
            {t('slugHint', { slug: slug || '…' })}
          </span>
        </label>

        <label>
          {tCommon('status')} <span className="cms-field-req">{tCommon('required')}</span>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
          >
            <option value="draft">{tStatus('draft')}</option>
            <option value="published">{tStatus('published')}</option>
            <option value="archived">{tStatus('archived')}</option>
          </select>
          <StatusHints />
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="news-info-heading">
        <h2 id="news-info-heading" className="cms-form-section-title">
          {t('newsInformation')}
        </h2>

        <label>
          {tCommon('summary')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="summary"
            rows={3}
            defaultValue={initial.summary}
            placeholder="Short description shown on the public news listing and article page"
          />
          <span className="cms-field-hint">{t('summaryHint')}</span>
        </label>

        <label>
          {tCommon('category')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input
            name="category"
            defaultValue={initial.category}
            placeholder="Update"
          />
          <span className="cms-field-hint">{t('categoryHint')}</span>
        </label>

        <label>
          {tCommon('content')} <span className="cms-field-req">{tCommon('required')}</span>
          <textarea
            name="content"
            rows={12}
            defaultValue={initial.content}
            required
            placeholder="Write the news content…"
          />
        </label>
      </section>

      {state.error ? (
        <p className="cms-form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="cms-form-success">{state.success}</p> : null}

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
        </div>
      </div>
    </form>
  )
}

export function NewsViewer({
  title,
  slug,
  summary,
  category,
  content,
  status,
  updatedAtLabel,
}: {
  title: string
  slug: string
  summary: string
  category: string
  content: string
  status: ContentStatus
  updatedAtLabel: string
}) {
  const t = useTranslations('cms.news')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')

  return (
    <div className="cms-page-form cms-page-viewer">
      <section className="cms-form-section" aria-labelledby="news-viewer-basic">
        <h2 id="news-viewer-basic" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>
        <label>
          {tCommon('title')}
          <p>{title}</p>
        </label>
        <label>
          {tCommon('publicUrl')}
          <p>
            <code>/news/{slug}</code>
          </p>
        </label>
        <label>
          {tCommon('status')}
          <p>
            <span className={`cms-status-pill ${status}`}>{tStatus(status)}</span>
          </p>
        </label>
        <label>
          {tCommon('updated')}
          <p className="cms-muted">{updatedAtLabel}</p>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="news-viewer-info">
        <h2 id="news-viewer-info" className="cms-form-section-title">
          {t('newsInformation')}
        </h2>
        <label>
          {tCommon('summary')}
          <p>{summary || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('category')}
          <p>{category || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('content')}
          <textarea readOnly rows={12} value={content} />
        </label>
      </section>
    </div>
  )
}

export function ArchiveNewsButton({ id }: { id: string }) {
  const t = useTranslations('cms.news')
  return (
    <form action={archiveNewsAction} className="cms-archive-form">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="cms-danger"
        onClick={(e) => {
          if (!confirm(t('archiveConfirm'))) {
            e.preventDefault()
          }
        }}
      >
        {t('archiveButton')}
      </button>
    </form>
  )
}

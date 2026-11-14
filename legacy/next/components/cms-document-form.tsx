'use client'

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { DocumentActionState } from '@/app/cms/documents/actions'
import {
  archiveDocumentAction,
  createDocumentAction,
  updateDocumentAction,
} from '@/app/cms/documents/actions'
import { normalizeSlug } from '@/lib/content/page-fields'

const initialState: DocumentActionState = {}

type ContentStatus = 'draft' | 'published' | 'archived'

type DocumentFormValues = {
  id?: string
  title: string
  slug: string
  summary: string
  category: string
  year: string
  fileUrl: string
  fileType: string
  fileSize: string
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

export function DocumentEditorForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit'
  initial: DocumentFormValues
}) {
  const t = useTranslations('cms.documents')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')
  const action = mode === 'create' ? createDocumentAction : updateDocumentAction
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

      <section className="cms-form-section" aria-labelledby="document-basic-heading">
        <h2 id="document-basic-heading" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>

        <label>
          {tCommon('title')} <span className="cms-field-req">{tCommon('required')}</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Annual performance report 2025/26"
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
            placeholder="annual-performance-report"
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

      <section className="cms-form-section" aria-labelledby="document-info-heading">
        <h2 id="document-info-heading" className="cms-form-section-title">
          {t('documentInformation')}
        </h2>

        <label>
          {tCommon('category')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input name="category" defaultValue={initial.category} placeholder="Reports" />
        </label>

        <label>
          {tCommon('year')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input name="year" defaultValue={initial.year} placeholder="2026" />
        </label>

        <label>
          {tCommon('description')}{' '}
          <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="summary"
            rows={4}
            defaultValue={initial.summary}
            placeholder="Short description for the resources listing"
          />
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="document-file-heading">
        <h2 id="document-file-heading" className="cms-form-section-title">
          {t('fileSection')}
        </h2>

        <label>
          {t('fileUrl')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input
            name="fileUrl"
            defaultValue={initial.fileUrl}
            placeholder="/files/annual-report.pdf or https://…"
          />
          <span className="cms-field-hint">{t('fileHint')}</span>
        </label>

        <label>
          {t('fileType')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input name="fileType" defaultValue={initial.fileType} placeholder="PDF" />
        </label>

        <label>
          {t('fileSize')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input name="fileSize" defaultValue={initial.fileSize} placeholder="1.8 MB" />
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
                ? t('createDocument')
                : tCommon('saveChanges')}
          </button>
        </div>
      </div>
    </form>
  )
}

export function DocumentViewer({
  title,
  slug,
  summary,
  category,
  year,
  fileUrl,
  fileMeta,
  status,
}: {
  title: string
  slug: string
  summary: string
  category: string
  year: string
  fileUrl: string
  fileMeta: string
  status: ContentStatus
}) {
  const t = useTranslations('cms.documents')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')

  return (
    <div className="cms-page-form cms-page-viewer">
      <section className="cms-form-section" aria-labelledby="document-viewer-basic">
        <h2 id="document-viewer-basic" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>
        <label>
          {tCommon('title')}
          <p>{title}</p>
        </label>
        <label>
          {tCommon('publicUrl')}
          <p>
            <code>/resources/{slug}</code>
          </p>
        </label>
        <label>
          {tCommon('status')}
          <p>
            <span className={`cms-status-pill ${status}`}>{tStatus(status)}</span>
          </p>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="document-viewer-info">
        <h2 id="document-viewer-info" className="cms-form-section-title">
          {t('documentInformation')}
        </h2>
        <label>
          {tCommon('category')}
          <p>{category || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('year')}
          <p>{year || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('description')}
          <p>{summary || tCommon('emptyDash')}</p>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="document-viewer-file">
        <h2 id="document-viewer-file" className="cms-form-section-title">
          {t('fileSection')}
        </h2>
        <label>
          {tCommon('file')}
          <p>{fileMeta || tCommon('emptyDash')}</p>
        </label>
        <label>
          {t('fileUrl')}
          <p>{fileUrl || tCommon('emptyDash')}</p>
        </label>
      </section>
    </div>
  )
}

export function ArchiveDocumentButton({ id }: { id: string }) {
  const t = useTranslations('cms.documents')
  return (
    <form action={archiveDocumentAction} className="cms-archive-form">
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

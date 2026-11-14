'use client'

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { EventActionState } from '@/app/cms/events/actions'
import {
  archiveEventAction,
  createEventAction,
  updateEventAction,
} from '@/app/cms/events/actions'
import { normalizeSlug } from '@/lib/content/page-fields'

const initialState: EventActionState = {}

type ContentStatus = 'draft' | 'published' | 'archived'

type EventFormValues = {
  id?: string
  title: string
  slug: string
  summary: string
  content: string
  eventDate: string
  location: string
  type: string
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

export function EventEditorForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit'
  initial: EventFormValues
}) {
  const t = useTranslations('cms.events')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')
  const action = mode === 'create' ? createEventAction : updateEventAction
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

      <section className="cms-form-section" aria-labelledby="event-basic-heading">
        <h2 id="event-basic-heading" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>

        <label>
          {tCommon('title')} <span className="cms-field-req">{tCommon('required')}</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="National public service dialogue"
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
            placeholder="national-public-service-dialogue"
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

      <section className="cms-form-section" aria-labelledby="event-details-heading">
        <h2 id="event-details-heading" className="cms-form-section-title">
          {t('eventDetails')}
        </h2>

        <label>
          {t('eventDate')} <span className="cms-field-req">{tCommon('required')}</span>
          <input
            type="datetime-local"
            name="eventDate"
            defaultValue={initial.eventDate}
            required
          />
        </label>

        <label>
          {tCommon('type')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input name="type" defaultValue={initial.type} placeholder="Public forum" />
        </label>

        <label>
          {tCommon('location')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input
            name="location"
            defaultValue={initial.location}
            placeholder="Addis Ababa · National Conference Centre"
          />
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="event-content-heading">
        <h2 id="event-content-heading" className="cms-form-section-title">
          {t('eventContent')}
        </h2>

        <label>
          {tCommon('summary')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="summary"
            rows={3}
            defaultValue={initial.summary}
            placeholder="Short summary for the events listing"
          />
        </label>

        <label>
          {tCommon('content')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="content"
            rows={10}
            defaultValue={initial.content}
            placeholder="Event details"
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
                ? t('createEvent')
                : tCommon('saveChanges')}
          </button>
        </div>
      </div>
    </form>
  )
}

export function EventViewer({
  title,
  slug,
  summary,
  content,
  eventDateLabel,
  type,
  location,
  status,
}: {
  title: string
  slug: string
  summary: string
  content: string
  eventDateLabel: string
  type: string
  location: string
  status: ContentStatus
}) {
  const t = useTranslations('cms.events')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')

  return (
    <div className="cms-page-form cms-page-viewer">
      <section className="cms-form-section" aria-labelledby="event-viewer-basic">
        <h2 id="event-viewer-basic" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>
        <label>
          {tCommon('title')}
          <p>{title}</p>
        </label>
        <label>
          {tCommon('publicUrl')}
          <p>
            <code>/events/{slug}</code>
          </p>
        </label>
        <label>
          {tCommon('status')}
          <p>
            <span className={`cms-status-pill ${status}`}>{tStatus(status)}</span>
          </p>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="event-viewer-details">
        <h2 id="event-viewer-details" className="cms-form-section-title">
          {t('eventDetails')}
        </h2>
        <label>
          {t('eventDate')}
          <p>{eventDateLabel}</p>
        </label>
        <label>
          {tCommon('type')}
          <p>{type || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('location')}
          <p>{location || tCommon('emptyDash')}</p>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="event-viewer-content">
        <h2 id="event-viewer-content" className="cms-form-section-title">
          {t('eventContent')}
        </h2>
        <label>
          {tCommon('summary')}
          <p>{summary || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('content')}
          <textarea readOnly rows={10} value={content} />
        </label>
      </section>
    </div>
  )
}

export function ArchiveEventButton({ id }: { id: string }) {
  const t = useTranslations('cms.events')
  return (
    <form action={archiveEventAction} className="cms-archive-form">
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

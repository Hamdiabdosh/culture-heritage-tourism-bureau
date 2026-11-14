'use client'

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ServiceActionState } from '@/app/cms/services/actions'
import {
  archiveServiceAction,
  createServiceAction,
  updateServiceAction,
} from '@/app/cms/services/actions'
import { normalizeSlug } from '@/lib/content/page-fields'

const SERVICE_ICONS = ['file', 'message', 'megaphone', 'building', 'book'] as const
type ServiceIcon = (typeof SERVICE_ICONS)[number]
type ContentStatus = 'draft' | 'published' | 'archived'

const initialState: ServiceActionState = {}

type ServiceFormValues = {
  id?: string
  title: string
  slug: string
  summary: string
  description: string
  category: string
  responsibleOffice: string
  eligibility: string
  requiredDocuments: string
  process: string
  contact: string
  icon: ServiceIcon
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

export function ServiceEditorForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit'
  initial: ServiceFormValues
}) {
  const t = useTranslations('cms.services')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')
  const action = mode === 'create' ? createServiceAction : updateServiceAction
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

      <section className="cms-form-section" aria-labelledby="service-basic-heading">
        <h2 id="service-basic-heading" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>

        <label>
          {tCommon('title')} <span className="cms-field-req">{tCommon('required')}</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Public service information"
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
            placeholder="public-service-information"
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

      <section className="cms-form-section" aria-labelledby="service-info-heading">
        <h2 id="service-info-heading" className="cms-form-section-title">
          {t('serviceInformation')}
        </h2>

        <label>
          {tCommon('summary')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="summary"
            rows={3}
            defaultValue={initial.summary}
            placeholder="Short summary for the services directory"
          />
        </label>

        <label>
          {tCommon('description')}{' '}
          <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="description"
            rows={6}
            defaultValue={initial.description}
            placeholder="About this service"
          />
        </label>

        <label>
          {tCommon('category')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input
            name="category"
            defaultValue={initial.category}
            placeholder="Information and guidance"
          />
        </label>

        <label>
          {tCommon('icon')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <select name="icon" defaultValue={initial.icon}>
            {SERVICE_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="service-details-heading">
        <h2 id="service-details-heading" className="cms-form-section-title">
          {t('serviceDetails')}
        </h2>

        <label>
          {t('responsibleOffice')}{' '}
          <span className="cms-field-opt">{tCommon('optional')}</span>
          <input
            name="responsibleOffice"
            defaultValue={initial.responsibleOffice}
            placeholder="Service Standards Directorate"
          />
        </label>

        <label>
          {tCommon('eligibility')}{' '}
          <span className="cms-field-opt">{tCommon('optional')}</span>
          <input
            name="eligibility"
            defaultValue={initial.eligibility}
            placeholder="Open to all citizens and institutions."
          />
        </label>

        <label>
          {tCommon('contact')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <input
            name="contact"
            defaultValue={initial.contact}
            placeholder="info@example.gov.et"
          />
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="service-process-heading">
        <h2 id="service-process-heading" className="cms-form-section-title">
          {t('requirementsProcess')}
        </h2>

        <label>
          {t('requiredDocuments')}{' '}
          <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="requiredDocuments"
            rows={4}
            defaultValue={initial.requiredDocuments}
            placeholder={'One document per line\nNo documents required'}
          />
          <span className="cms-field-hint">{t('oneItemPerLine')}</span>
        </label>

        <label>
          {t('processSteps')} <span className="cms-field-opt">{tCommon('optional')}</span>
          <textarea
            name="process"
            rows={5}
            defaultValue={initial.process}
            placeholder={'One step per line\nReview the guidance\nContact the office if needed'}
          />
          <span className="cms-field-hint">{t('oneStepPerLine')}</span>
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
                ? t('createService')
                : tCommon('saveChanges')}
          </button>
        </div>
      </div>
    </form>
  )
}

export function ServiceViewer({
  title,
  slug,
  summary,
  description,
  category,
  responsibleOffice,
  eligibility,
  contact,
  icon,
  requiredDocuments,
  process,
  status,
  updatedAtLabel,
}: {
  title: string
  slug: string
  summary: string
  description: string
  category: string
  responsibleOffice: string
  eligibility: string
  contact: string
  icon: string
  requiredDocuments: string
  process: string
  status: ContentStatus
  updatedAtLabel: string
}) {
  const t = useTranslations('cms.services')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')

  return (
    <div className="cms-page-form cms-page-viewer">
      <section className="cms-form-section" aria-labelledby="service-viewer-basic">
        <h2 id="service-viewer-basic" className="cms-form-section-title">
          {tCommon('basicInformation')}
        </h2>
        <label>
          {tCommon('title')}
          <p>{title}</p>
        </label>
        <label>
          {tCommon('publicUrl')}
          <p>
            <code>/services/{slug}</code>
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

      <section className="cms-form-section" aria-labelledby="service-viewer-info">
        <h2 id="service-viewer-info" className="cms-form-section-title">
          {t('serviceInformation')}
        </h2>
        <label>
          {tCommon('summary')}
          <p>{summary || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('description')}
          <textarea readOnly rows={6} value={description} />
        </label>
        <label>
          {tCommon('category')}
          <p>{category || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('icon')}
          <p>{icon}</p>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="service-viewer-details">
        <h2 id="service-viewer-details" className="cms-form-section-title">
          {t('serviceDetails')}
        </h2>
        <label>
          {t('responsibleOffice')}
          <p>{responsibleOffice || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('eligibility')}
          <p>{eligibility || tCommon('emptyDash')}</p>
        </label>
        <label>
          {tCommon('contact')}
          <p>{contact || tCommon('emptyDash')}</p>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="service-viewer-process">
        <h2 id="service-viewer-process" className="cms-form-section-title">
          {t('requirementsProcess')}
        </h2>
        <label>
          {t('requiredDocuments')}
          <textarea readOnly rows={4} value={requiredDocuments} />
        </label>
        <label>
          {t('processSteps')}
          <textarea readOnly rows={5} value={process} />
        </label>
      </section>
    </div>
  )
}

export function ArchiveServiceButton({ id }: { id: string }) {
  const t = useTranslations('cms.services')
  return (
    <form action={archiveServiceAction} className="cms-archive-form">
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

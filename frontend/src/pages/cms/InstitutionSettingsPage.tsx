import { useEffect, useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import { ApiClientError, institutionApi, type InstitutionInput } from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { siteTemplate } from '../../lib/site-template'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'

const empty: InstitutionInput = {
  name: '',
  shortName: '',
  tagline: '',
  description: '',
  eyebrow: '',
  address: '',
  phone: '',
  email: '',
  hours: '',
}

export function CmsInstitutionSettingsPage() {
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.institution')
  const tCommon = useT('cms.common')
  const tNav = useT('cms.navigation')
  const [values, setValues] = useState<InstitutionInput>(empty)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const officeName = institution?.name ?? siteTemplate.fallbackInstitutionName
  useDocumentTitle(formatDocumentTitle(t('title'), officeName))

  useEffect(() => {
    let cancelled = false
    institutionApi
      .get()
      .then((inst) => {
        if (cancelled) return
        setValues({
          name: inst.name ?? '',
          shortName: inst.shortName ?? '',
          tagline: inst.tagline ?? '',
          description: inst.description ?? '',
          eyebrow: inst.eyebrow ?? '',
          address: inst.address ?? '',
          phone: inst.phone ?? '',
          email: inst.email ?? '',
          hours: inst.hours ?? '',
        })
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
  }, [])

  function setField(key: keyof InstitutionInput, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canWrite) return
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      await institutionApi.cmsUpdate(values)
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

  const fields: { key: keyof InstitutionInput; label: string; kind: 'text' | 'textarea'; required?: boolean }[] =
    [
      { key: 'name', label: t('name'), kind: 'text', required: true },
      { key: 'shortName', label: t('shortName'), kind: 'text', required: true },
      { key: 'eyebrow', label: t('eyebrow'), kind: 'text' },
      { key: 'tagline', label: t('tagline'), kind: 'text' },
      { key: 'description', label: t('description'), kind: 'textarea' },
      { key: 'address', label: t('address'), kind: 'textarea' },
      { key: 'phone', label: t('phone'), kind: 'text' },
      { key: 'email', label: t('email'), kind: 'text' },
      { key: 'hours', label: t('hours'), kind: 'text' },
    ]

  return (
    <div className="cms-pages">
      <header className="cms-pages-header">
        <div>
          <span className="cms-kicker">{tNav('administration')}</span>
          <h1>{t('title')}</h1>
          <p>{t('intro')}</p>
        </div>
        <div className="cms-pages-header-actions">
          <Link to="/cms">{tCommon('backOverview')}</Link>
        </div>
      </header>

      {!canWrite ? (
        <div className="cms-page-form cms-page-viewer">
          {fields.map((field) => (
            <label key={field.key}>
              {field.label}
              <p>{values[field.key] || tCommon('emptyDash')}</p>
            </label>
          ))}
          <p className="cms-muted">{tCommon('viewerCannotEdit')}</p>
        </div>
      ) : (
        <form className="cms-page-form" onSubmit={onSubmit}>
          <section className="cms-form-section">
            {fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.required ? (
                  <span className="cms-field-req">{tCommon('required')}</span>
                ) : (
                  <span className="cms-field-opt">{tCommon('optional')}</span>
                )}
                {field.kind === 'textarea' ? (
                  <textarea
                    rows={4}
                    value={values[field.key]}
                    onChange={(e) => setField(field.key, e.target.value)}
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.key === 'email' ? 'email' : 'text'}
                    value={values[field.key]}
                    onChange={(e) => setField(field.key, e.target.value)}
                    required={field.required}
                  />
                )}
              </label>
            ))}
          </section>

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

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { CmsOutletContext } from '../../components/cms/CmsLayout'
import {
  ApiClientError,
  institutionApi,
  type InstitutionInput,
  type ProfileTranslation,
} from '../../lib/api-client'
import { useT } from '../../lib/i18n'
import { siteTemplate } from '../../lib/site-template'
import { formatDocumentTitle, useDocumentTitle } from '../../lib/use-document-title'

const LANGS = ['am', 'om', 'ha'] as const

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
  mission: '',
  vision: '',
  history: '',
  values: [],
  objectives: [],
  profileTranslations: {},
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function listToLines(items: string[] | undefined): string {
  return (items ?? []).join('\n')
}

export function CmsInstitutionSettingsPage() {
  const { canWrite, institution } = useOutletContext<CmsOutletContext>()
  const t = useT('cms.institution')
  const tCommon = useT('cms.common')
  const tNav = useT('cms.navigation')
  const [values, setValues] = useState<InstitutionInput>(empty)
  const [valuesText, setValuesText] = useState('')
  const [objectivesText, setObjectivesText] = useState('')
  const [trText, setTrText] = useState<
    Record<(typeof LANGS)[number], { mission: string; vision: string; history: string; values: string; objectives: string }>
  >({
    am: { mission: '', vision: '', history: '', values: '', objectives: '' },
    om: { mission: '', vision: '', history: '', values: '', objectives: '' },
    ha: { mission: '', vision: '', history: '', values: '', objectives: '' },
  })
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

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
          mission: inst.mission ?? '',
          vision: inst.vision ?? '',
          history: inst.history ?? '',
          values: inst.values ?? [],
          objectives: inst.objectives ?? [],
          profileTranslations: inst.profileTranslations ?? {},
        })
        setValuesText(listToLines(inst.values))
        setObjectivesText(listToLines(inst.objectives))
        const nextTr = {
          am: { mission: '', vision: '', history: '', values: '', objectives: '' },
          om: { mission: '', vision: '', history: '', values: '', objectives: '' },
          ha: { mission: '', vision: '', history: '', values: '', objectives: '' },
        }
        for (const lang of LANGS) {
          const entry = inst.profileTranslations?.[lang]
          nextTr[lang] = {
            mission: entry?.mission ?? '',
            vision: entry?.vision ?? '',
            history: entry?.history ?? '',
            values: listToLines(entry?.values),
            objectives: listToLines(entry?.objectives),
          }
        }
        setTrText(nextTr)
        setDirty(false)
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

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function setField<K extends keyof InstitutionInput>(key: K, value: InstitutionInput[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setDirty(true)
  }

  function setTrField(
    lang: (typeof LANGS)[number],
    key: 'mission' | 'vision' | 'history' | 'values' | 'objectives',
    value: string,
  ) {
    setTrText((prev) => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }))
    setDirty(true)
  }

  const identityFields = useMemo(
    () =>
      [
        { key: 'name' as const, label: t('name'), kind: 'text' as const, required: true },
        { key: 'shortName' as const, label: t('shortName'), kind: 'text' as const, required: true },
        { key: 'eyebrow' as const, label: t('eyebrow'), kind: 'text' as const, required: false },
        { key: 'tagline' as const, label: t('tagline'), kind: 'text' as const, required: false },
        { key: 'description' as const, label: t('description'), kind: 'textarea' as const, required: false },
        { key: 'address' as const, label: t('address'), kind: 'textarea' as const, required: false },
        { key: 'phone' as const, label: t('phone'), kind: 'text' as const, required: false },
        { key: 'email' as const, label: t('email'), kind: 'text' as const, required: false },
        { key: 'hours' as const, label: t('hours'), kind: 'text' as const, required: false },
      ] as const,
    [t],
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canWrite) return
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      const profileTranslations: InstitutionInput['profileTranslations'] = {}
      for (const lang of LANGS) {
        const entry: ProfileTranslation = {}
        const mission = trText[lang].mission.trim()
        const vision = trText[lang].vision.trim()
        const history = trText[lang].history.trim()
        const valuesList = linesToList(trText[lang].values)
        const objectivesList = linesToList(trText[lang].objectives)
        if (mission) entry.mission = mission
        if (vision) entry.vision = vision
        if (history) entry.history = history
        if (valuesList.length) entry.values = valuesList
        if (objectivesList.length) entry.objectives = objectivesList
        if (Object.keys(entry).length) profileTranslations[lang] = entry
      }

      const payload: InstitutionInput = {
        ...values,
        values: linesToList(valuesText),
        objectives: linesToList(objectivesText),
        profileTranslations,
      }
      const saved = await institutionApi.cmsUpdate(payload)
      setValues({
        ...payload,
        mission: saved.mission ?? '',
        vision: saved.vision ?? '',
        history: saved.history ?? '',
        values: saved.values ?? [],
        objectives: saved.objectives ?? [],
        profileTranslations: saved.profileTranslations ?? {},
      })
      setValuesText(listToLines(saved.values))
      setObjectivesText(listToLines(saved.objectives))
      setDirty(false)
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
          <p className="cms-muted">{tCommon('viewerCannotEdit')}</p>
        </div>
      ) : (
        <form className="cms-page-form" onSubmit={onSubmit}>
          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionIdentity')}</h2>
            {identityFields.map((field) => (
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

          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionMissionVision')}</h2>
            <label>
              {t('mission')}
              <span className="cms-field-opt">{tCommon('optional')}</span>
              <textarea
                rows={4}
                value={values.mission}
                onChange={(e) => setField('mission', e.target.value)}
                placeholder={t('leaveBlankUntilConfirmed')}
              />
            </label>
            <label>
              {t('vision')}
              <span className="cms-field-opt">{tCommon('optional')}</span>
              <textarea
                rows={4}
                value={values.vision}
                onChange={(e) => setField('vision', e.target.value)}
                placeholder={t('leaveBlankUntilConfirmed')}
              />
            </label>
          </section>

          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionHistory')}</h2>
            <label>
              {t('history')}
              <span className="cms-field-opt">{tCommon('optional')}</span>
              <textarea
                rows={8}
                value={values.history}
                onChange={(e) => setField('history', e.target.value)}
                placeholder={t('leaveBlankUntilConfirmed')}
              />
            </label>
          </section>

          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionValues')}</h2>
            <label>
              {t('values')}
              <span className="cms-field-opt">{tCommon('optional')}</span>
              <textarea
                rows={5}
                value={valuesText}
                onChange={(e) => {
                  setValuesText(e.target.value)
                  setDirty(true)
                }}
                placeholder={t('listPlaceholder')}
              />
            </label>
          </section>

          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionObjectives')}</h2>
            <label>
              {t('objectives')}
              <span className="cms-field-opt">{tCommon('optional')}</span>
              <textarea
                rows={5}
                value={objectivesText}
                onChange={(e) => {
                  setObjectivesText(e.target.value)
                  setDirty(true)
                }}
                placeholder={t('listPlaceholder')}
              />
            </label>
          </section>

          <section className="cms-form-section">
            <h2 className="cms-form-section-title">{t('sectionTranslations')}</h2>
            <p className="cms-muted">{t('translationsHint')}</p>
            {LANGS.map((lang) => (
              <fieldset key={lang} className="cms-fieldset">
                <legend>{t(`lang_${lang}`)}</legend>
                <label>
                  {t('mission')}
                  <textarea
                    rows={3}
                    value={trText[lang].mission}
                    onChange={(e) => setTrField(lang, 'mission', e.target.value)}
                  />
                </label>
                <label>
                  {t('vision')}
                  <textarea
                    rows={3}
                    value={trText[lang].vision}
                    onChange={(e) => setTrField(lang, 'vision', e.target.value)}
                  />
                </label>
                <label>
                  {t('history')}
                  <textarea
                    rows={4}
                    value={trText[lang].history}
                    onChange={(e) => setTrField(lang, 'history', e.target.value)}
                  />
                </label>
                <label>
                  {t('values')}
                  <textarea
                    rows={3}
                    value={trText[lang].values}
                    onChange={(e) => setTrField(lang, 'values', e.target.value)}
                    placeholder={t('listPlaceholder')}
                  />
                </label>
                <label>
                  {t('objectives')}
                  <textarea
                    rows={3}
                    value={trText[lang].objectives}
                    onChange={(e) => setTrField(lang, 'objectives', e.target.value)}
                    placeholder={t('listPlaceholder')}
                  />
                </label>
              </fieldset>
            ))}
          </section>

          {error ? (
            <p className="cms-form-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? <p className="cms-form-success">{success}</p> : null}
          {dirty ? <p className="cms-muted">{t('unsavedChanges')}</p> : null}

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

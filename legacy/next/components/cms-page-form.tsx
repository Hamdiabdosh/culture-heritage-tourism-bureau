'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PageActionState } from '@/app/cms/content/actions'
import { createPageAction, updatePageAction, archivePageAction } from '@/app/cms/content/actions'
import { normalizeSlug } from '@/lib/content/page-fields'
import {
  TRANSLATION_LANGUAGES,
  type PageTranslations,
  type TranslationLanguageCode,
} from '@/lib/content/page-translations'
import { institutionConfig } from '@/lib/institution-config'

const initialState: PageActionState = {}

type EditorTab = 'en' | TranslationLanguageCode

type TranslationFill = 'complete' | 'incomplete' | 'empty'

type PageFormValues = {
  id?: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published' | 'archived'
  translations?: PageTranslations
}

function translationFill(title: string, content: string): TranslationFill {
  const hasTitle = title.trim().length > 0
  const hasContent = content.trim().length > 0
  if (hasTitle && hasContent) return 'complete'
  if (hasTitle || hasContent) return 'incomplete'
  return 'empty'
}

function fillMark(fill: TranslationFill) {
  if (fill === 'complete') return '✓'
  if (fill === 'incomplete') return '~'
  return '—'
}

function normalizeTranslations(translations: PageTranslations) {
  const normalized: Record<string, { title: string; content: string }> = {}
  for (const language of TRANSLATION_LANGUAGES) {
    normalized[language.code] = {
      title: translations[language.code]?.title ?? '',
      content: translations[language.code]?.content ?? '',
    }
  }
  return normalized
}

function formSnapshot(values: {
  title: string
  slug: string
  content: string
  status: string
  translations: PageTranslations
}) {
  return JSON.stringify({
    title: values.title,
    slug: values.slug,
    content: values.content,
    status: values.status,
    translations: normalizeTranslations(values.translations),
  })
}

export function PageEditorForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit'
  initial: PageFormValues
}) {
  const t = useTranslations('cms.pages')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')
  const action = mode === 'create' ? createPageAction : updatePageAction
  const [state, formAction, pending] = useActionState(action, initialState)
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [content, setContent] = useState(initial.content)
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [status, setStatus] = useState(initial.status)
  const [tab, setTab] = useState<EditorTab>('en')
  const [translations, setTranslations] = useState<PageTranslations>(
    initial.translations ?? {},
  )
  const [baseline, setBaseline] = useState(() =>
    formSnapshot({
      title: initial.title,
      slug: initial.slug,
      content: initial.content,
      status: initial.status,
      translations: initial.translations ?? {},
    }),
  )
  const wasPending = useRef(false)

  function fillLabel(fill: TranslationFill) {
    if (fill === 'complete') return t('translated')
    if (fill === 'incomplete') return t('incomplete')
    return t('notTranslatedYet')
  }

  useEffect(() => {
    if (!slugTouched) {
      setSlug(normalizeSlug(title))
    }
  }, [title, slugTouched])

  const currentSnapshot = formSnapshot({ title, slug, content, status, translations })
  const isDirty = currentSnapshot !== baseline

  // After a successful save, treat the current fields as the new saved baseline.
  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      setBaseline(formSnapshot({ title, slug, content, status, translations }))
    }
    wasPending.current = pending
  }, [pending, state.success, title, slug, content, status, translations])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty || pending) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty, pending])

  // Catch CMS sidebar / header links before Next.js client navigation.
  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!isDirty || pending) return
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      if (anchor.target === '_blank') return

      const url = new URL(href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return
      }

      const leave = window.confirm(t('unsavedLeave'))
      if (!leave) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [isDirty, pending, t])

  function setTranslationField(
    code: TranslationLanguageCode,
    field: 'title' | 'content',
    value: string,
  ) {
    setTranslations((prev) => ({
      ...prev,
      [code]: {
        title: field === 'title' ? value : (prev[code]?.title ?? ''),
        content: field === 'content' ? value : (prev[code]?.content ?? ''),
      },
    }))
  }

  const incompleteTranslationLabels = TRANSLATION_LANGUAGES.filter((language) => {
    const fill = translationFill(
      translations[language.code]?.title ?? '',
      translations[language.code]?.content ?? '',
    )
    return fill !== 'complete'
  }).map((language) => language.label)

  const showPublishTranslationWarning =
    status === 'published' && incompleteTranslationLabels.length > 0

  const englishFill: TranslationFill = title.trim() ? 'complete' : 'empty'
  const activeLanguage =
    institutionConfig.languages.find((language) => language.code === tab) ??
    institutionConfig.languages[0]
  const activeFill =
    tab === 'en'
      ? englishFill
      : translationFill(
          translations[tab]?.title ?? '',
          translations[tab]?.content ?? '',
        )

  return (
    <form action={formAction} className="cms-page-form">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <section className="cms-form-section" aria-labelledby="page-settings-heading">
        <h2 id="page-settings-heading" className="cms-form-section-title">
          {t('pageSettings')}
        </h2>

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
            placeholder="about-the-office"
          />
          <span className="cms-field-hint">
            {t('publicUrlHint', { slug: slug || '…' })}
          </span>
        </label>

        <label>
          {tCommon('status')} <span className="cms-field-req">{tCommon('required')}</span>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PageFormValues['status'])}
          >
            <option value="draft">{tStatus('draft')}</option>
            <option value="published">{tStatus('published')}</option>
            <option value="archived">{tStatus('archived')}</option>
          </select>
          <span className="cms-field-hint cms-status-hints">
            <span>{tStatus('hintDraft')}</span>
            <span>{tStatus('hintPublished')}</span>
            <span>{tStatus('hintArchived')}</span>
          </span>
        </label>
      </section>

      <section className="cms-form-section" aria-labelledby="page-content-heading">
        <h2 id="page-content-heading" className="cms-form-section-title">
          {t('pageContent')}
        </h2>

        <div className="cms-lang-tabs" role="tablist" aria-label={t('pageLanguage')}>
          {institutionConfig.languages.map((language) => {
            const fill =
              language.code === 'en'
                ? englishFill
                : translationFill(
                    translations[language.code as TranslationLanguageCode]?.title ?? '',
                    translations[language.code as TranslationLanguageCode]?.content ?? '',
                  )
            return (
              <button
                key={language.code}
                type="button"
                role="tab"
                aria-selected={tab === language.code}
                className={tab === language.code ? 'is-active' : undefined}
                onClick={() => setTab(language.code as EditorTab)}
              >
                <span>{language.label}</span>
                <span
                  className={`cms-lang-fill cms-lang-fill-${fill}`}
                  aria-hidden="true"
                  title={
                    language.code === 'en'
                      ? fill === 'complete'
                        ? t('englishTitleSet')
                        : t('englishTitleNeeded')
                      : fillLabel(fill)
                  }
                >
                  {fillMark(fill)}
                </span>
              </button>
            )
          })}
        </div>

        <p className="cms-lang-note">{t('englishMainNote')}</p>

        <p className="cms-lang-active" aria-live="polite">
          {t('editingLang', { lang: activeLanguage.label })}
          {tab === 'en' ? (
            <span>{t('mainLanguage')}</span>
          ) : (
            <span>
              {' · '}
              {fillLabel(activeFill)}
            </span>
          )}
        </p>

        {/* Keep every language’s fields mounted so submit always includes them. */}
        <div hidden={tab !== 'en'} className="cms-lang-panel">
          <label>
            {tCommon('title')} <span className="cms-field-req">{tCommon('required')}</span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="About the Office"
            />
          </label>
          <label>
            {tCommon('content')} <span className="cms-field-opt">{tCommon('optional')}</span>
            <textarea
              name="content"
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the page content…"
            />
          </label>
        </div>

        {TRANSLATION_LANGUAGES.map((language) => {
          const code = language.code
          const entry = translations[code]
          return (
            <div key={code} hidden={tab !== code} className="cms-lang-panel">
              <label>
                {tCommon('title')} <span className="cms-field-opt">{tCommon('optional')}</span>
                <input
                  name={`translation_${code}_title`}
                  value={entry?.title ?? ''}
                  onChange={(e) => setTranslationField(code, 'title', e.target.value)}
                  placeholder={`${language.label} title`}
                />
              </label>
              <label>
                {tCommon('content')}{' '}
                <span className="cms-field-opt">{tCommon('optional')}</span>
                <textarea
                  name={`translation_${code}_content`}
                  rows={12}
                  value={entry?.content ?? ''}
                  onChange={(e) => setTranslationField(code, 'content', e.target.value)}
                  placeholder={`${language.label} content`}
                />
              </label>
            </div>
          )
        })}
      </section>

      {state.error ? (
        <p className="cms-form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="cms-form-success">{state.success}</p> : null}

      {showPublishTranslationWarning ? (
        <aside className="cms-form-warn" role="status">
          <strong>{t('incompleteWarningTitle')}</strong>
          <p>
            {t('incompleteWarningBody', {
              langs: incompleteTranslationLabels.join(', '),
            })}
          </p>
        </aside>
      ) : null}

      <div className="cms-form-footer">
        <div className="cms-form-actions">
          <button className="cms-primary" type="submit" disabled={pending}>
            {pending
              ? mode === 'create'
                ? tCommon('creating')
                : tCommon('saving')
              : mode === 'create'
                ? t('createPage')
                : tCommon('saveChanges')}
          </button>
        </div>
        <p className="cms-field-hint cms-save-hint">{t('savesAllNote')}</p>
      </div>
    </form>
  )
}

export function PageViewer({
  title,
  slug,
  content,
  status,
  translations,
  updatedAtLabel,
}: {
  title: string
  slug: string
  content: string
  status: 'draft' | 'published' | 'archived'
  translations?: PageTranslations | null
  updatedAtLabel: string
}) {
  const t = useTranslations('cms.pages')
  const tCommon = useTranslations('cms.common')
  const tStatus = useTranslations('cms.status')
  const [tab, setTab] = useState<EditorTab>('en')
  const normalized = translations ?? {}

  function fillLabel(fill: TranslationFill) {
    if (fill === 'complete') return t('translated')
    if (fill === 'incomplete') return t('incomplete')
    return t('notTranslatedYet')
  }

  return (
    <div className="cms-page-form cms-page-viewer">
      <section className="cms-form-section" aria-labelledby="viewer-settings-heading">
        <h2 id="viewer-settings-heading" className="cms-form-section-title">
          {t('pageSettings')}
        </h2>
        <label>
          {tCommon('publicUrl')}
          <p>
            <code>/{slug}</code>
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

      <section className="cms-form-section" aria-labelledby="viewer-content-heading">
        <h2 id="viewer-content-heading" className="cms-form-section-title">
          {t('pageContent')}
        </h2>

        <div className="cms-lang-tabs" role="tablist" aria-label={t('pageLanguage')}>
          {institutionConfig.languages.map((language) => {
            const fill =
              language.code === 'en'
                ? title.trim()
                  ? 'complete'
                  : 'empty'
                : translationFill(
                    normalized[language.code as TranslationLanguageCode]?.title ?? '',
                    normalized[language.code as TranslationLanguageCode]?.content ?? '',
                  )
            return (
              <button
                key={language.code}
                type="button"
                role="tab"
                aria-selected={tab === language.code}
                className={tab === language.code ? 'is-active' : undefined}
                onClick={() => setTab(language.code as EditorTab)}
              >
                <span>{language.label}</span>
                <span className={`cms-lang-fill cms-lang-fill-${fill}`} aria-hidden="true">
                  {fillMark(fill)}
                </span>
              </button>
            )
          })}
        </div>

        <p className="cms-lang-note">{t('englishMainNote')}</p>

        <div hidden={tab !== 'en'} className="cms-lang-panel">
          <label>
            {tCommon('title')}
            <p>{title}</p>
          </label>
          <label>
            {tCommon('content')}
            <textarea readOnly rows={12} value={content} />
          </label>
        </div>

        {TRANSLATION_LANGUAGES.map((language) => {
          const entry = normalized[language.code]
          const fill = translationFill(entry?.title ?? '', entry?.content ?? '')
          return (
            <div key={language.code} hidden={tab !== language.code} className="cms-lang-panel">
              <p className="cms-lang-active">
                {language.label} · {fillLabel(fill)}
              </p>
              {fill === 'empty' ? (
                <p className="cms-muted">
                  {t('noTranslationYet', { lang: language.label })}
                </p>
              ) : (
                <>
                  <label>
                    {tCommon('title')}
                    <p>{entry?.title?.trim() ? entry.title : tCommon('emptyDash')}</p>
                  </label>
                  <label>
                    {tCommon('content')}
                    <textarea readOnly rows={12} value={entry?.content ?? ''} />
                  </label>
                </>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

export function ArchivePageButton({ id }: { id: string }) {
  const t = useTranslations('cms.pages')
  return (
    <form action={archivePageAction} className="cms-archive-form">
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

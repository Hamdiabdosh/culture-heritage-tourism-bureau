import {
  institutionConfig,
  type LanguageCode,
} from '@/lib/institution-config'

export type { LanguageCode }

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

/** Cookie + ?lang= preference key for public locale selection. */
export const LANG_COOKIE = 'lang'

/** Non-English codes that may appear in pages.translations JSONB. */
export type TranslationLanguageCode = Exclude<LanguageCode, 'en'>

export type PageTranslationFields = {
  title: string
  content: string | null
}

export type PageTranslations = Partial<
  Record<TranslationLanguageCode, PageTranslationFields>
>

const LANGUAGE_CODES = new Set<string>(
  institutionConfig.languages.map((language) => language.code),
)

export const TRANSLATION_LANGUAGES = institutionConfig.languages.filter(
  (language): language is (typeof institutionConfig.languages)[number] & {
    code: TranslationLanguageCode
  } => language.code !== DEFAULT_LANGUAGE,
)

/** Invalid / unknown codes become English. */
export function resolveLanguageCode(raw?: string | null): LanguageCode {
  const code = raw?.trim().toLowerCase()
  if (code && LANGUAGE_CODES.has(code)) {
    return code as LanguageCode
  }
  return DEFAULT_LANGUAGE
}

export function isTranslationLanguage(
  code: LanguageCode,
): code is TranslationLanguageCode {
  return code !== DEFAULT_LANGUAGE
}

export function emptyPageTranslations(): PageTranslations {
  return {}
}

/** Drop empty locales; never persist English inside translations. */
export function normalizePageTranslations(
  input: PageTranslations | null | undefined,
): PageTranslations {
  const out: PageTranslations = {}
  if (!input || typeof input !== 'object') return out

  for (const language of TRANSLATION_LANGUAGES) {
    const entry = input[language.code]
    if (!entry || typeof entry !== 'object') continue
    const title = typeof entry.title === 'string' ? entry.title.trim() : ''
    const contentRaw = typeof entry.content === 'string' ? entry.content.trim() : ''
    const content = contentRaw ? contentRaw : null
    if (!title && !content) continue
    out[language.code] = { title, content }
  }

  return out
}

/** Compact CMS list coverage — counts languages with real title/content data. */
export function getPageTranslationCoverage(page: {
  title: string
  translations?: PageTranslations | null
}) {
  const normalized = normalizePageTranslations(page.translations)
  const languages = institutionConfig.languages.map((language) => {
    if (language.code === DEFAULT_LANGUAGE) {
      return {
        code: language.code,
        short: 'EN',
        present: Boolean(page.title?.trim()),
      }
    }
    const entry = normalized[language.code as TranslationLanguageCode]
    return {
      code: language.code,
      short: language.code.toUpperCase(),
      present: Boolean(entry && (entry.title || entry.content)),
    }
  })

  return {
    languages,
    ready: languages.filter((language) => language.present).length,
    total: languages.length,
  }
}

export function resolvePageContent(
  page: { title: string; content: string | null; translations?: PageTranslations | null },
  language?: string | null,
): { title: string; content: string | null; language: LanguageCode; usedFallback: boolean } {
  const lang = resolveLanguageCode(language)
  const englishTitle = page.title
  const englishContent = page.content

  if (lang === DEFAULT_LANGUAGE) {
    return {
      title: englishTitle,
      content: englishContent,
      language: lang,
      usedFallback: false,
    }
  }

  if (!isTranslationLanguage(lang)) {
    return {
      title: englishTitle,
      content: englishContent,
      language: lang,
      usedFallback: false,
    }
  }

  const translation = normalizePageTranslations(page.translations)[lang]
  if (translation && (translation.title || translation.content)) {
    return {
      title: translation.title || englishTitle,
      content: translation.content ?? englishContent,
      language: lang,
      usedFallback: false,
    }
  }

  // Missing translation must never hide the page — fall back to English.
  return {
    title: englishTitle,
    content: englishContent,
    language: lang,
    usedFallback: true,
  }
}

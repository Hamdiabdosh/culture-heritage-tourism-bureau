import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Locale = 'en' | 'am' | 'om' | 'ha'

/** BCP 47 language tags for <html lang>. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: 'en',
  am: 'am',
  om: 'om',
  ha: 'har',
}

export const LANGUAGES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { code: 'om', label: 'Afan Oromo', nativeLabel: 'Afaan Oromoo' },
  { code: 'ha', label: 'Harari', nativeLabel: 'ሀረሪ' },
]

const LANG_COOKIE = 'lang'
const LOCALES = new Set<string>(LANGUAGES.map((l) => l.code))

type Messages = Record<string, unknown>

type I18nValue = {
  locale: Locale
  setLocale: (code: Locale) => void
  t: (path: string, vars?: Record<string, string | number>) => string
  ready: boolean
}

const I18nContext = createContext<I18nValue | null>(null)

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import('@messages/en.json'),
  am: () => import('@messages/am.json'),
  om: () => import('@messages/om.json'),
  ha: () => import('@messages/ha.json'),
}

function readLangCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )lang=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function resolveLocale(raw: string | null | undefined): Locale {
  const code = String(raw ?? '')
    .trim()
    .toLowerCase()
  return LOCALES.has(code) ? (code as Locale) : 'en'
}

function lookup(messages: Messages, path: string): string | undefined {
  const parts = path.split('.')
  let cur: unknown = messages
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`,
  )
}

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const fromQuery = new URLSearchParams(window.location.search).get('lang')
  return resolveLocale(fromQuery ?? readLangCookie())
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)
  const [messages, setMessages] = useState<Messages | null>(null)

  useEffect(() => {
    let cancelled = false
    loaders[locale]().then((mod) => {
      if (!cancelled) setMessages(mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale]
  }, [locale])

  // Honor ?lang= on first paint / back-forward.
  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('lang')
    if (fromQuery != null && String(fromQuery).trim() !== '') {
      const resolved = resolveLocale(fromQuery)
      if (readLangCookie() !== resolved) {
        document.cookie = `${LANG_COOKIE}=${resolved};path=/;max-age=31536000;SameSite=Lax`
      }
      setLocaleState(resolved)
    }
  }, [])

  const value = useMemo<I18nValue>(() => {
    function setLocale(code: Locale) {
      document.cookie = `${LANG_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`
      const url = new URL(window.location.href)
      if (code === 'en') url.searchParams.delete('lang')
      else url.searchParams.set('lang', code)
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
      setLocaleState(code)
    }

    function t(path: string, vars?: Record<string, string | number>) {
      const raw = messages ? lookup(messages, path) : undefined
      return interpolate(raw ?? path, vars)
    }

    return { locale, setLocale, t, ready: messages != null }
  }, [locale, messages])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider')
  return ctx
}

/** next-intl-style helper: useT('navigation') → t('home') */
export function useT(namespace?: string) {
  const { t } = useI18n()
  return (key: string, vars?: Record<string, string | number>) =>
    t(namespace ? `${namespace}.${key}` : key, vars)
}

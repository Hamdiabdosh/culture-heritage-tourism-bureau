import { useEffect } from 'react'
import { LANGUAGES, type Locale } from './i18n'

type PageHeadOpts = {
  title?: string | null
  description?: string | null
  /** Pathname only, e.g. `/news/foo` (lang query added for hreflang). */
  path?: string
  noindex?: boolean
  locale?: Locale
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const sel = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(sel) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`
  let el = document.head.querySelector(sel) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    if (hreflang) el.hreflang = hreflang
    document.head.appendChild(el)
  }
  el.href = href
}

function clearHreflang() {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove())
}

function absoluteUrl(path: string, lang?: Locale) {
  const origin = window.location.origin
  const url = new URL(path || '/', origin)
  if (lang && lang !== 'en') url.searchParams.set('lang', lang)
  else url.searchParams.delete('lang')
  return url.toString()
}

/** Title, description, canonical, hreflang, and optional noindex. */
export function usePageHead({ title, description, path, noindex = false, locale = 'en' }: PageHeadOpts) {
  useEffect(() => {
    if (title?.trim()) document.title = title.trim()

    if (description?.trim()) {
      upsertMeta('name', 'description', description.trim())
    }

    upsertMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow')

    const pathname = path ?? window.location.pathname
    upsertLink('canonical', absoluteUrl(pathname, locale === 'en' ? undefined : locale))

    clearHreflang()
    for (const lang of LANGUAGES) {
      upsertLink('alternate', absoluteUrl(pathname, lang.code), lang.code)
    }
    upsertLink('alternate', absoluteUrl(pathname), 'x-default')
  }, [title, description, path, noindex, locale])
}

/** Lightweight noindex toggle for soft-404 screens. */
export function useNoIndex(active: boolean) {
  useEffect(() => {
    if (!active) return
    upsertMeta('name', 'robots', 'noindex, follow')
    return () => {
      upsertMeta('name', 'robots', 'index, follow')
    }
  }, [active])
}

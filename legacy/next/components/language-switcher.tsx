'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, Globe2 } from 'lucide-react'
import { institutionConfig, type LanguageCode } from '@/lib/institution-config'
import { LANG_COOKIE, resolveLanguageCode } from '@/lib/content/page-translations'

const { languages } = institutionConfig
const defaultLanguage = languages[0]

type LanguageOption = (typeof languages)[number]

function readLangCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )lang=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Shared locale control for public site and CMS.
 * Persists via the existing `lang` cookie + optional `?lang=` query.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('header')
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<LanguageOption>(defaultLanguage)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('lang')
    const code = resolveLanguageCode(fromQuery ?? readLangCookie())
    setCurrent(languages.find((item) => item.code === code) ?? defaultLanguage)

    // Keep next-intl in sync when arriving via ?lang= without a matching cookie.
    if (fromQuery != null && String(fromQuery).trim() !== '') {
      const resolved = resolveLanguageCode(fromQuery)
      if (readLangCookie() !== resolved) {
        document.cookie = `${LANG_COOKIE}=${resolved};path=/;max-age=31536000;SameSite=Lax`
        router.refresh()
      }
    }
  }, [pathname, router])

  function choose(code: LanguageCode) {
    document.cookie = `${LANG_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`
    const params = new URLSearchParams(window.location.search)
    if (code === 'en') params.delete('lang')
    else params.set('lang', code)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
    router.refresh()
    setCurrent(languages.find((item) => item.code === code) ?? defaultLanguage)
    setOpen(false)
  }

  return (
    <div className={className ? `lang-switcher ${className}` : 'lang-switcher'}>
      <button
        type="button"
        aria-label={t('changeLanguage')}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <Globe2 size={14} /> {current.label} <ChevronDown size={13} />
      </button>
      {open ? (
        <ul className="lang-menu" role="listbox" aria-label={t('languages')}>
          {languages.map((item) => (
            <li key={item.code} role="option" aria-selected={item.code === current.code}>
              <button type="button" onClick={() => choose(item.code)}>
                {item.nativeLabel}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

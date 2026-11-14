import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useI18n, useT } from '../lib/i18n'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  const t = useT('header')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0]

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={root} className={className ? `lang-switcher ${className}` : 'lang-switcher'}>
      <button
        type="button"
        aria-label={t('changeLanguage')}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        {current.label} ▾
      </button>
      {open ? (
        <ul className="lang-menu" role="listbox" aria-label={t('languages')}>
          {LANGUAGES.map((item) => (
            <li key={item.code} role="option" aria-selected={item.code === locale}>
              <button
                type="button"
                onClick={() => {
                  setLocale(item.code)
                  setOpen(false)
                }}
              >
                {item.nativeLabel}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

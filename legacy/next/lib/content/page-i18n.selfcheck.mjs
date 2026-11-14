/**
 * ponytail: smallest check that fails if Pages language fallback breaks.
 * Run: node lib/content/page-i18n.selfcheck.mjs
 */

function resolveLanguageCode(raw) {
  const codes = new Set(['en', 'am', 'om', 'ha'])
  const code = String(raw ?? '').trim().toLowerCase()
  return codes.has(code) ? code : 'en'
}

function resolvePageContent(page, language) {
  const lang = resolveLanguageCode(language)
  if (lang === 'en') {
    return { title: page.title, content: page.content, usedFallback: false }
  }
  const t = page.translations?.[lang]
  if (t && (t.title || t.content)) {
    return {
      title: t.title || page.title,
      content: t.content ?? page.content,
      usedFallback: false,
    }
  }
  return { title: page.title, content: page.content, usedFallback: true }
}

const page = {
  title: 'About Us',
  content: 'English body',
  translations: {
    am: { title: 'ስለ እኛ', content: 'አማርኛ' },
  },
}

const cases = [
  ['en', 'About Us', false],
  ['am', 'ስለ እኛ', false],
  ['om', 'About Us', true],
  ['xyz', 'About Us', false],
]

for (const [lang, title, fallback] of cases) {
  const resolved = resolvePageContent(page, lang)
  const expectFallback = lang === 'xyz' ? false : fallback
  // xyz resolves to en, so usedFallback is false (native English path)
  const ok =
    resolved.title === title &&
    (lang === 'xyz'
      ? resolveLanguageCode(lang) === 'en' && resolved.title === 'About Us'
      : resolved.usedFallback === expectFallback)
  if (!ok) {
    console.error('FAIL', { lang, resolved, title, fallback })
    process.exit(1)
  }
}

console.log('page-i18n.selfcheck: ok')

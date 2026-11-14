import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { LANG_COOKIE, resolveLanguageCode } from '@/lib/content/page-translations'
import { defaultLocale, isAppLocale } from './locales'

/**
 * next-intl request config — locale from the existing `lang` cookie.
 * No locale-prefixed routing; ?lang= continues to set this cookie via LanguageSwitcher.
 */
export default getRequestConfig(async () => {
  const jar = await cookies()
  const raw = jar.get(LANG_COOKIE)?.value
  const locale = resolveLanguageCode(raw)

  if (!isAppLocale(locale)) {
    return {
      locale: defaultLocale,
      messages: (await import(`../messages/${defaultLocale}.json`)).default,
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})

import { institutionConfig, type LanguageCode } from '@/lib/institution-config'

/** Supported public UI locales — same codes as institutionConfig / CMS. */
export const locales = institutionConfig.languages.map(
  (language) => language.code,
) as readonly LanguageCode[]

export const defaultLocale: LanguageCode = 'en'

export type AppLocale = LanguageCode

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value)
}

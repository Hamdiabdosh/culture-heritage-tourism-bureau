import type { LanguageCode } from '@/lib/institution-config'

/**
 * Map app locale codes to Intl BCP-47 tags for public date formatting.
 * `ha` is Harari in this project, not Hausa — Intl has no Harari locale, so
 * date formatting falls back to en-GB (same visual style as English).
 */
export function toIntlLocale(locale: string): string {
  switch (locale as LanguageCode) {
    case 'am':
      return 'am-ET'
    case 'om':
      return 'om-ET'
    case 'ha':
      return 'en-GB'
    case 'en':
    default:
      return 'en-GB'
  }
}

/**
 * Public listing/article dates.
 * Keep the previous en-GB order (day month year) while localizing month names.
 */
export function formatPublicDate(value: Date | null, locale: string) {
  const date = value ?? new Date()
  const parts = new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('day')} ${get('month')} ${get('year')}`
}

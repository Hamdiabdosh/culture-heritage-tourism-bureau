import { cookies } from 'next/headers'
import {
  LANG_COOKIE,
  resolveLanguageCode,
  type LanguageCode,
} from '@/lib/content/page-translations'

/** Prefer ?lang=, then cookie, then English. Invalid codes → English. */
export async function getRequestLanguage(
  searchLang?: string | null,
): Promise<LanguageCode> {
  if (searchLang != null && String(searchLang).trim() !== '') {
    return resolveLanguageCode(searchLang)
  }

  const jar = await cookies()
  return resolveLanguageCode(jar.get(LANG_COOKIE)?.value)
}

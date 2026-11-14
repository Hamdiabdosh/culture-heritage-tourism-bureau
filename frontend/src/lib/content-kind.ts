import type { ServiceItem } from './api-client'

/** Phase 1: experiences are services whose category starts with "Experience". */
export function isExperienceService(item: Pick<ServiceItem, 'category'>): boolean {
  return (item.category ?? '').trim().toLowerCase().startsWith('experience')
}

export function publicServicePath(item: Pick<ServiceItem, 'category' | 'slug'>): string {
  return isExperienceService(item) ? `/experiences/${item.slug}` : `/explore/${item.slug}`
}

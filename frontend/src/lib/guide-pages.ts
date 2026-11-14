/** Fixed Visit Harar CMS guide slots (About is static — not listed here). */

export type GuideSlot = {
  slug: 'plan' | 'plan-itineraries'
  publicPath: string
  labelKey: 'slotPlan' | 'slotItineraries'
  hintKey: 'hintPlan' | 'hintItineraries'
  /** Dedicated editor route when not generic entity edit */
  editPath?: string
}

export const GUIDE_SLOTS: GuideSlot[] = [
  {
    slug: 'plan',
    publicPath: '/plan',
    labelKey: 'slotPlan',
    hintKey: 'hintPlan',
    editPath: '/cms/content/plan',
  },
  {
    slug: 'plan-itineraries',
    publicPath: '/plan/itineraries',
    labelKey: 'slotItineraries',
    hintKey: 'hintItineraries',
  },
]

export function isGuideSlug(slug: string): boolean {
  return slug === 'plan' || slug === 'plan-itineraries'
}

export function publicPathForGuideSlug(slug: string): string | null {
  return GUIDE_SLOTS.find((s) => s.slug === slug)?.publicPath ?? null
}

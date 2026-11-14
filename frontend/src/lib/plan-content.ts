/** Structured Plan your visit body stored as JSON in pages.content (slug=plan). */

export const PLAN_SECTION_IDS = ['arrive', 'around', 'season', 'respect', 'hyena'] as const

export type PlanSectionId = (typeof PLAN_SECTION_IDS)[number]

export type PlanSection = {
  id: PlanSectionId
  title: string
  body: string
  /** Optional CMS upload path, e.g. /api/media/…. */
  image: string
}

export type PlanContent = {
  version: 1
  title: string
  sections: PlanSection[]
}

const DEFAULT_TITLES: Record<PlanSectionId, string> = {
  arrive: 'How to get to Harar',
  around: 'Getting around',
  season: 'Best season',
  respect: 'Respect',
  hyena: 'Hyena feeding',
}

function section(
  id: PlanSectionId,
  body: string,
  image = '',
): PlanSection {
  return { id, title: DEFAULT_TITLES[id], body, image }
}

export const DEFAULT_PLAN_CONTENT: PlanContent = {
  version: 1,
  title: 'Plan your visit',
  sections: [
    section(
      'arrive',
      'Harar has no airport. Fly to Dire Dawa (DIR), then continue by road (~50–55 km, typically ~1–1.5 hours). Overnight rail to Dire Dawa may be available — confirm schedules locally. Road from Addis Ababa commonly takes most of a day (~9–12 hours).',
    ),
    section(
      'around',
      'Inside Jugol, walk only — the historic core is a maze of narrow alleys. Outside the walls, bajaj (three-wheelers) are the usual short trip.',
    ),
    section(
      'season',
      'October–March is generally most comfortable for walking (especially November–February). More rain is likely April–May and parts of July–September.',
    ),
    section(
      'respect',
      'Dress modestly (shoulders and knees). Ask before photographing people. At mosques and shrines, follow your tour guide’s guidance on access. Remove shoes where others have.',
    ),
    section(
      'hyena',
      'Arrange only through the Eco-park / official Tourism Commission office. Fee and timing: confirm at the desk.',
    ),
  ],
}

function emptySections(): PlanSection[] {
  return PLAN_SECTION_IDS.map((id) => section(id, ''))
}

function normalizeImage(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const image = raw.trim()
  if (!image) return ''
  if (image.startsWith('/') && !image.startsWith('//')) return image.slice(0, 512)
  if (/^https:\/\//i.test(image)) return image.slice(0, 512)
  return ''
}

/** Parse CMS content: structured JSON, or legacy plain paragraphs → notes in arrive. */
export function parsePlanContent(raw: string | null | undefined): PlanContent {
  const text = (raw ?? '').trim()
  if (!text) return structuredClone(DEFAULT_PLAN_CONTENT)

  if (text.startsWith('{')) {
    try {
      const data = JSON.parse(text) as Partial<PlanContent>
      if (data && data.version === 1 && Array.isArray(data.sections)) {
        const byId = new Map(
          data.sections
            .filter((s): s is PlanSection => !!s && typeof s.id === 'string')
            .map((s) => [s.id, s]),
        )
        return {
          version: 1,
          title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Plan your visit',
          sections: PLAN_SECTION_IDS.map((id) => {
            const found = byId.get(id)
            return {
              id,
              title: found?.title?.trim() || DEFAULT_TITLES[id],
              body: found?.body ?? '',
              image: normalizeImage(found?.image),
            }
          }),
        }
      }
    } catch {
      // fall through to legacy
    }
  }

  // Legacy freeform body → keep text under Arrive so nothing is lost
  const sections = emptySections()
  sections[0] = { ...sections[0], body: text }
  return { version: 1, title: 'Plan your visit', sections }
}

export function serializePlanContent(content: PlanContent): string {
  return JSON.stringify({
    version: 1,
    title: content.title.trim() || 'Plan your visit',
    sections: PLAN_SECTION_IDS.map((id) => {
      const s = content.sections.find((x) => x.id === id)
      return {
        id,
        title: s?.title?.trim() || DEFAULT_TITLES[id],
        body: s?.body ?? '',
        image: normalizeImage(s?.image),
      }
    }),
  })
}

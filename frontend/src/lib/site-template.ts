/**
 * Adopter knobs for the VisitHarar site template.
 * Institution identity (name, contact, content) comes from the PHP API / CMS.
 * Replace hero files under `public/hero/` and edit this list when refreshing photography.
 */
export type HeroSlide = {
  /** Path under the SPA public root, e.g. `/hero/hero-01.jpg` */
  src: string
}

export const siteTemplate = {
  /** Auto-advancing home hero slides. Empty array → solid brand colour only. */
  heroSlides: [
    { src: '/hero/hero-01.jpg' },
    { src: '/hero/hero-02.jpg' },
    { src: '/hero/hero-03.jpg' },
  ] satisfies HeroSlide[],

  /** Milliseconds between hero advances. */
  heroIntervalMs: 7000,

  /** Fallback label when the API has not returned an institution yet. */
  fallbackInstitutionName: 'VisitHarar' as string,

  /** Fallback short name shown under the brand lockup. */
  fallbackShortName: 'Harar' as string,

  /** Fallback utility-bar eyebrow. */
  fallbackEyebrow: 'Harari Regional State Tourism Commission' as string,
} as const

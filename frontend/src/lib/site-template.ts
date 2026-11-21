/**
 * Shared public-site defaults for the Bureau institutional website.
 * Live institution name/contact/content come from the PHP API / CMS.
 * Do not invent official logos or seals here — use a text wordmark until the Bureau supplies one.
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
  fallbackInstitutionName: 'Harari Culture, Heritage & Tourism Bureau' as string,

  /** Fallback short name shown under the brand lockup. */
  fallbackShortName: 'CHTB' as string,

  /** Fallback utility-bar eyebrow. */
  fallbackEyebrow: 'Harari People Regional State' as string,
} as const

/**
 * Single source of truth for institution customization.
 * Demo values: National Public Service Office (NPSO) — replace per deployment.
 */
export type LanguageCode = 'en' | 'am' | 'om' | 'ha'

export const institutionConfig = {
  institution: {
    name: 'National Public Service Office',
    shortName: 'NPSO',
    tagline: 'Serving the public interest',
    eyebrow: 'Federal Democratic Republic of Ethiopia',
    description:
      'Improving public service delivery through clear standards, capable institutions, and information that works for everyone.',
    address: 'Arada Sub-city, Addis Ababa, Ethiopia',
    phone: '+251 11 123 4567',
    email: 'info@npso.gov.et',
    hours: 'Monday–Friday, 8:30 AM–5:30 PM',
  },
  languages: [
    { code: 'en' as LanguageCode, label: 'English', nativeLabel: 'English' },
    { code: 'ha' as LanguageCode, label: 'Harari', nativeLabel: 'ሀረሪ' },
    { code: 'am' as LanguageCode, label: 'Amharic', nativeLabel: 'አማርኛ' },
    { code: 'om' as LanguageCode, label: 'Afan Oromo', nativeLabel: 'Afaan Oromoo' },
  ],
  social: {
    facebook: '#',
    x: '#',
    youtube: '#',
    telegram: '#',
    linkedin: '#',
  },
  homepage: {
    notice: true,
    services: true,
    news: true,
    events: true,
    resources: true,
    partners: true,
  },
  /** Related institutions shown on the homepage — site config, not CMS content. */
  relatedInstitutions: [
    'Federal government portal',
    'Public Service Commission',
    'Office of the Ombudsman',
    'National Planning Commission',
  ],
  navigation: [
    { key: 'home', href: '/' },
    { key: 'about', href: '/about' },
    { key: 'services', href: '/services' },
    { key: 'news', href: '/news' },
    { key: 'events', href: '/events' },
    { key: 'resources', href: '/resources' },
  ],
} as const

export type InstitutionConfig = typeof institutionConfig

/** Convenience alias for the institution identity object. */
export const institution = institutionConfig.institution

export const seoDefaults = {
  title: `${institutionConfig.institution.name} | Ethiopia`,
  description: `Official information and public services from the ${institutionConfig.institution.name} of Ethiopia.`,
} as const

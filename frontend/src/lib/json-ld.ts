import type { Institution } from './api-client'

/** Inject or replace a JSON-LD script tag in <head>. */
export function setJsonLd(id: string, data: Record<string, unknown> | null) {
  const existing = document.getElementById(id)
  if (!data) {
    existing?.remove()
    return
  }
  let el = existing as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/** GovernmentOrganization JSON-LD for the Bureau site (function name kept for call sites). */
export function governmentOrgLd(institution: Institution | null | undefined): Record<string, unknown> | null {
  if (!institution) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name: institution.name,
    alternateName: institution.shortName ?? undefined,
    description: institution.description ?? institution.tagline ?? undefined,
    url: typeof window !== 'undefined' ? window.location.origin : undefined,
    address: institution.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: institution.address,
          addressLocality: 'Harar',
          addressRegion: 'Harari',
          addressCountry: 'ET',
        }
      : undefined,
    telephone: institution.phone ?? undefined,
    email: institution.email ?? undefined,
  }
}

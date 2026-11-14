/** Google / Apple Maps search URLs from a free-text address. */
export function mapsLinks(address: string | null | undefined): {
  google: string
  apple: string
} | null {
  const q = address?.trim()
  if (!q) return null
  const encoded = encodeURIComponent(q)
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    apple: `https://maps.apple.com/?q=${encoded}`,
  }
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

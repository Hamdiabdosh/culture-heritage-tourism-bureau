/** en-GB-style public dates (day month year). */
export function formatPublicDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')} ${get('month')} ${get('year')}`
}

/** Event card parts in East Africa Time (display). */
export function formatEventDateParts(value: string | null | undefined): {
  day: string
  month: string
  year: string
} {
  if (!value) return { day: '', month: '', year: '' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { day: '', month: '', year: '' }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Addis_Ababa',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return { day: get('day'), month: get('month'), year: get('year') }
}

export function splitParagraphs(content: string | null | undefined): string[] {
  return (content ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

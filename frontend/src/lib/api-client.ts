/**
 * Thin same-origin API client stub for the future Vite SPA.
 * Not wired to the Next.js app. Types are placeholders pending Agent B JSON shapes.
 *
 * @see docs/PASS4_REACT_SPA_MAP.md
 * @see docs/FULL_MIGRATION_MAP.md §3
 */

export type ApiErrorCode =
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode
    message: string
  }
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | 'UNKNOWN'
  readonly body: unknown

  constructor(status: number, body: unknown) {
    const parsed = body as Partial<ApiErrorBody> | null
    const message =
      parsed?.error?.message ?? `Request failed with status ${status}`
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = parsed?.error?.code ?? 'UNKNOWN'
    this.body = body
  }
}

/** Raw published news row as expected from PHP (placeholder — align with Agent B). */
export type NewsListItem = {
  id: string
  slug: string
  title: string
  summary: string | null
  category: string | null
  coverImage: string | null
  content: string | null
  publishedAt: string | null
  createdAt: string | null
}

export type NewsDetail = NewsListItem

/** Props shape already used by `NewsPage` in institution-site (after date format). */
export type PublicNewsCard = {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  date: string
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

const CSRF_COOKIE = 'egwp_csrf'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Same-origin fetch with session cookies + CSRF double-submit on mutations.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal, headers = {} } = options
  const mutating = method !== 'GET'
  const skipCsrf = path === '/api/auth/login'

  let hdrs: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  }
  if (mutating && !skipCsrf) {
    const token = readCookie(CSRF_COOKIE)
    if (token) hdrs['X-CSRF-Token'] = token
  }

  const init: RequestInit = {
    method,
    credentials: 'include',
    signal,
    headers: hdrs,
  }

  if (body !== undefined) {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    }
    init.body = JSON.stringify(body)
  }

  // Ensure CSRF cookie exists before first mutating call (e.g. logout after cold load).
  if (mutating && !skipCsrf && !readCookie(CSRF_COOKIE)) {
    await fetch('/api/auth/session', { credentials: 'include' })
    const token = readCookie(CSRF_COOKIE)
    if (token) {
      init.headers = { ...(init.headers as Record<string, string>), 'X-CSRF-Token': token }
    }
  }

  const res = await fetch(path, init)
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    throw new ApiClientError(res.status, data)
  }

  return data as T
}

type ItemsResponse<T> = { items: T[] }

export type CmsNews = NewsListItem & {
  status: 'draft' | 'published' | 'archived'
  updatedAt: string | null
}

export type NewsInput = {
  title: string
  slug: string
  summary: string
  category: string
  coverImage: string
  content: string
  status: 'draft' | 'published' | 'archived'
}

/** Public + CMS news helpers. */
export const newsApi = {
  async list(): Promise<NewsListItem[]> {
    const data = await apiFetch<ItemsResponse<NewsListItem>>('/api/news')
    return data.items
  },

  bySlug(slug: string): Promise<NewsDetail> {
    return apiFetch<NewsDetail>(`/api/news/${encodeURIComponent(slug)}`)
  },

  async cmsList(): Promise<CmsNews[]> {
    const data = await apiFetch<ItemsResponse<CmsNews>>('/api/cms/news')
    return data.items
  },

  cmsById(id: string): Promise<CmsNews> {
    return apiFetch<CmsNews>(`/api/cms/news/${encodeURIComponent(id)}`)
  },

  cmsCreate(body: NewsInput): Promise<CmsNews> {
    return apiFetch<CmsNews>('/api/cms/news', { method: 'POST', body })
  },

  cmsUpdate(id: string, body: NewsInput): Promise<CmsNews> {
    return apiFetch<CmsNews>(`/api/cms/news/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
    })
  },

  cmsArchive(id: string): Promise<CmsNews> {
    return apiFetch<CmsNews>(`/api/cms/news/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}

/** Auth placeholders for Pass 10+ (not used until PHP session endpoints exist). */
export type SessionUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
}

export const authApi = {
  session(): Promise<{ user: SessionUser | null }> {
    return apiFetch('/api/auth/session')
  },

  login(email: string, password: string): Promise<{ user: SessionUser }> {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  },

  logout(): Promise<{ ok: true }> {
    return apiFetch('/api/auth/logout', { method: 'POST' })
  },
}

export type CmsUser = {
  id: string
  name: string
  email: string
  role: SessionUser['role']
  active: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type ProfileTranslation = {
  mission?: string
  vision?: string
  history?: string
  values?: string[]
  objectives?: string[]
}

export type Institution = {
  id: string
  name: string
  shortName: string
  tagline: string | null
  description: string | null
  eyebrow: string | null
  address: string | null
  phone: string | null
  email: string | null
  hours: string | null
  mission: string | null
  vision: string | null
  history: string | null
  values: string[]
  objectives: string[]
  profileTranslations: Partial<Record<'am' | 'om' | 'ha', ProfileTranslation>>
}

export type InstitutionInput = {
  name: string
  shortName: string
  tagline: string
  description: string
  eyebrow: string
  address: string
  phone: string
  email: string
  hours: string
  mission: string
  vision: string
  history: string
  values: string[]
  objectives: string[]
  profileTranslations: Partial<Record<'am' | 'om' | 'ha', ProfileTranslation>>
}

export const institutionApi = {
  get(): Promise<Institution> {
    return apiFetch('/api/institution')
  },
  cmsUpdate(body: InstitutionInput): Promise<Institution> {
    return apiFetch('/api/cms/institution', { method: 'PUT', body })
  },
}

export type PublicPage = {
  id: string
  slug: string
  title: string
  content: string | null
  status?: string
  updatedAt: string | null
  language?: string
  usedFallback?: boolean
}

export type EventItem = {
  id: string
  slug: string
  title: string
  summary: string | null
  content: string | null
  eventDate: string | null
  location: string | null
  type: string | null
  status?: string
  createdAt: string | null
}

export type ServiceItem = {
  id: string
  slug: string
  title: string
  summary: string | null
  description: string | null
  category: string | null
  responsibleOffice: string | null
  eligibility: string | null
  requiredDocuments: string[]
  process: string[]
  contact: string | null
  icon: string
  coverImage: string | null
  status?: string
  createdAt: string | null
}

export type DocumentItem = {
  id: string
  slug: string
  title: string
  summary: string | null
  category: string | null
  year: string | null
  fileUrl: string | null
  fileType: string | null
  fileSize: string | null
  status?: string
  createdAt: string | null
}

export type ContentStatus = 'draft' | 'published' | 'archived'

function cmsCrud<T, I>(base: string) {
  return {
    async cmsList(): Promise<T[]> {
      const data = await apiFetch<ItemsResponse<T>>(`/api/cms/${base}`)
      return data.items
    },
    cmsById(id: string): Promise<T> {
      return apiFetch(`/api/cms/${base}/${encodeURIComponent(id)}`)
    },
    cmsCreate(body: I): Promise<T> {
      return apiFetch(`/api/cms/${base}`, { method: 'POST', body })
    },
    cmsUpdate(id: string, body: I): Promise<T> {
      return apiFetch(`/api/cms/${base}/${encodeURIComponent(id)}`, { method: 'PUT', body })
    },
    cmsArchive(id: string): Promise<T> {
      return apiFetch(`/api/cms/${base}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}

export type CmsPage = {
  id: string
  slug: string
  title: string
  content: string | null
  status: ContentStatus
  updatedAt: string | null
}

export type PageInput = {
  title: string
  slug: string
  content: string
  status: ContentStatus
  translations?: Record<string, { title: string; content: string }>
}

export type CmsEvent = EventItem & { status: ContentStatus; updatedAt?: string | null }
export type EventInput = {
  title: string
  slug: string
  summary: string
  content: string
  eventDate: string
  location: string
  type: string
  status: ContentStatus
}

export type CmsService = ServiceItem & { status: ContentStatus; updatedAt?: string | null }
export type ServiceInput = {
  title: string
  slug: string
  summary: string
  description: string
  category: string
  responsibleOffice: string
  eligibility: string
  requiredDocuments: string[]
  process: string[]
  contact: string
  icon: string
  coverImage: string
  status: ContentStatus
}

export type CmsDocument = DocumentItem & { status: ContentStatus; updatedAt?: string | null }
export type DocumentInput = {
  title: string
  slug: string
  summary: string
  category: string
  year: string
  fileUrl: string
  fileType: string
  fileSize: string
  status: ContentStatus
}

export const pagesApi = {
  async list(lang?: string): Promise<PublicPage[]> {
    const q = lang && lang !== 'en' ? `?lang=${encodeURIComponent(lang)}` : ''
    const data = await apiFetch<ItemsResponse<PublicPage>>(`/api/pages${q}`)
    return data.items
  },

  bySlug(slug: string, lang?: string): Promise<PublicPage> {
    const q = lang && lang !== 'en' ? `?lang=${encodeURIComponent(lang)}` : ''
    return apiFetch(`/api/pages/${encodeURIComponent(slug)}${q}`)
  },

  ...cmsCrud<CmsPage, PageInput>('pages'),
}

export const eventsApi = {
  async list(): Promise<EventItem[]> {
    const data = await apiFetch<ItemsResponse<EventItem>>('/api/events')
    return data.items
  },

  bySlug(slug: string): Promise<EventItem> {
    return apiFetch(`/api/events/${encodeURIComponent(slug)}`)
  },

  ...cmsCrud<CmsEvent, EventInput>('events'),
}

export const servicesApi = {
  async list(): Promise<ServiceItem[]> {
    const data = await apiFetch<ItemsResponse<ServiceItem>>('/api/services')
    return data.items
  },

  bySlug(slug: string): Promise<ServiceItem> {
    return apiFetch(`/api/services/${encodeURIComponent(slug)}`)
  },

  ...cmsCrud<CmsService, ServiceInput>('services'),
}

export const documentsApi = {
  async list(): Promise<DocumentItem[]> {
    const data = await apiFetch<ItemsResponse<DocumentItem>>('/api/documents')
    return data.items
  },

  bySlug(slug: string): Promise<DocumentItem> {
    return apiFetch(`/api/documents/${encodeURIComponent(slug)}`)
  },

  ...cmsCrud<CmsDocument, DocumentInput>('documents'),
}

export const usersApi = {
  async list(): Promise<CmsUser[]> {
    const data = await apiFetch<{ items: CmsUser[] }>('/api/cms/users')
    return data.items
  },

  update(
    id: string,
    body: { role?: SessionUser['role']; active?: boolean },
  ): Promise<CmsUser> {
    return apiFetch(`/api/cms/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
    })
  },
}

export type MediaUploadResult = {
  url: string
  name: string
  mime: string
  size: number
}

/** Multipart image upload for CMS picture fields. */
export async function uploadMedia(file: File): Promise<MediaUploadResult> {
  const path = '/api/cms/media'
  if (!readCookie(CSRF_COOKIE)) {
    await fetch('/api/auth/session', { credentials: 'include' })
  }
  const token = readCookie(CSRF_COOKIE)
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
    },
    body: form,
  })

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    throw new ApiClientError(res.status, data)
  }
  return data as MediaUploadResult
}

import {
  documentsApi,
  eventsApi,
  pagesApi,
  servicesApi,
  type ContentStatus,
  type DocumentInput,
  type EventInput,
  type PageInput,
  type ServiceInput,
} from '../../lib/api-client'

export type Field = {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'datetime' | 'select' | 'lines' | 'image'
  required?: boolean
  rows?: number
  options?: string[]
  hint?: string
}

type Row = { id: string; title: string; slug: string; status: ContentStatus }

export type EntityKey = 'pages' | 'events' | 'services' | 'documents'

export type EntityConfig = {
  key: EntityKey
  label: string
  route: string
  publicPrefix: string
  fields: Field[]
  empty: Record<string, string>
  list: () => Promise<Row[]>
  get: (id: string) => Promise<Record<string, string> & { id: string; status: ContentStatus }>
  create: (body: Record<string, unknown>) => Promise<{ id: string }>
  update: (id: string, body: Record<string, unknown>) => Promise<unknown>
  archive: (id: string) => Promise<unknown>
  toBody: (values: Record<string, string>) => Record<string, unknown>
}

function statusField(): Field {
  return {
    key: 'status',
    label: 'Status',
    kind: 'select',
    options: ['draft', 'published', 'archived'],
    required: true,
  }
}

export const entities: Record<EntityKey, EntityConfig> = {
  pages: {
    key: 'pages',
    label: 'About & Plan',
    route: 'content',
    publicPrefix: '/',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', required: true },
      { key: 'slug', label: 'Slug', kind: 'text', required: true },
      statusField(),
      {
        key: 'content',
        label: 'Content',
        kind: 'textarea',
        rows: 14,
        hint: 'Plain paragraphs. Blank lines start a new paragraph on the public page.',
      },
    ],
    empty: { title: '', slug: '', content: '', status: 'draft' },
    list: async () => {
      const items = await pagesApi.cmsList()
      return items.map((i) => ({ id: i.id, title: i.title, slug: i.slug, status: i.status }))
    },
    get: async (id) => {
      const i = await pagesApi.cmsById(id)
      return {
        id: i.id,
        title: i.title,
        slug: i.slug,
        content: i.content ?? '',
        status: i.status,
      }
    },
    create: (body) => pagesApi.cmsCreate(body as PageInput),
    update: (id, body) => pagesApi.cmsUpdate(id, body as PageInput),
    archive: (id) => pagesApi.cmsArchive(id),
    toBody: (v) => ({
      title: v.title,
      slug: v.slug,
      content: v.content,
      status: v.status as ContentStatus,
    }),
  },
  events: {
    key: 'events',
    label: 'Events & festivals',
    route: 'events',
    publicPrefix: '/events/',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', required: true },
      { key: 'slug', label: 'Slug', kind: 'text', required: true },
      statusField(),
      { key: 'eventDate', label: 'Event date', kind: 'datetime', required: true },
      { key: 'location', label: 'Location', kind: 'text' },
      { key: 'type', label: 'Type', kind: 'text' },
      { key: 'summary', label: 'Summary', kind: 'textarea', rows: 3 },
      { key: 'content', label: 'Content', kind: 'textarea', rows: 8 },
    ],
    empty: {
      title: '',
      slug: '',
      summary: '',
      content: '',
      eventDate: '',
      location: '',
      type: '',
      status: 'draft',
    },
    list: async () => {
      const items = await eventsApi.cmsList()
      return items.map((i) => ({ id: i.id, title: i.title, slug: i.slug, status: i.status }))
    },
    get: async (id) => {
      const i = await eventsApi.cmsById(id)
      const raw = i.eventDate ?? ''
      // datetime-local wants YYYY-MM-DDTHH:mm
      const eventDate = raw.length >= 16 ? raw.slice(0, 16) : raw
      return {
        id: i.id,
        title: i.title,
        slug: i.slug,
        summary: i.summary ?? '',
        content: i.content ?? '',
        eventDate,
        location: i.location ?? '',
        type: i.type ?? '',
        status: i.status,
      }
    },
    create: (body) => eventsApi.cmsCreate(body as EventInput),
    update: (id, body) => eventsApi.cmsUpdate(id, body as EventInput),
    archive: (id) => eventsApi.cmsArchive(id),
    toBody: (v) => ({
      title: v.title,
      slug: v.slug,
      summary: v.summary,
      content: v.content,
      eventDate: v.eventDate,
      location: v.location,
      type: v.type,
      status: v.status as ContentStatus,
    }),
  },
  services: {
    key: 'services',
    label: 'Attractions & experiences',
    route: 'services',
    publicPrefix: '/explore/',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', required: true },
      { key: 'slug', label: 'Slug', kind: 'text', required: true },
      statusField(),
      {
        key: 'icon',
        label: 'Icon',
        kind: 'select',
        options: ['file', 'message', 'megaphone', 'building', 'book'],
        required: true,
      },
      {
        key: 'category',
        label: 'Category',
        kind: 'text',
        hint: 'Experiences must start with “Experience” (e.g. Experience · Wildlife). Attractions use other labels (e.g. Historic Gates).',
      },
      { key: 'responsibleOffice', label: 'Host / area', kind: 'text' },
      { key: 'eligibility', label: 'Visitor notes', kind: 'text' },
      { key: 'contact', label: 'Contact', kind: 'text' },
      {
        key: 'coverImage',
        label: 'Picture',
        kind: 'image',
      },
      { key: 'summary', label: 'Summary', kind: 'textarea', rows: 3 },
      { key: 'description', label: 'Description', kind: 'textarea', rows: 6 },
      { key: 'requiredDocuments', label: 'What to know / bring', kind: 'lines', hint: 'One per line' },
      { key: 'process', label: 'How to visit / participate', kind: 'lines', hint: 'One per line' },
    ],
    empty: {
      title: '',
      slug: '',
      summary: '',
      description: '',
      category: '',
      responsibleOffice: '',
      eligibility: '',
      requiredDocuments: '',
      process: '',
      contact: '',
      icon: 'file',
      coverImage: '',
      status: 'draft',
    },
    list: async () => {
      const items = await servicesApi.cmsList()
      return items.map((i) => ({ id: i.id, title: i.title, slug: i.slug, status: i.status }))
    },
    get: async (id) => {
      const i = await servicesApi.cmsById(id)
      return {
        id: i.id,
        title: i.title,
        slug: i.slug,
        summary: i.summary ?? '',
        description: i.description ?? '',
        category: i.category ?? '',
        responsibleOffice: i.responsibleOffice ?? '',
        eligibility: i.eligibility ?? '',
        requiredDocuments: (i.requiredDocuments ?? []).join('\n'),
        process: (i.process ?? []).join('\n'),
        contact: i.contact ?? '',
        icon: i.icon || 'file',
        coverImage: i.coverImage ?? '',
        status: i.status,
      }
    },
    create: (body) => servicesApi.cmsCreate(body as ServiceInput),
    update: (id, body) => servicesApi.cmsUpdate(id, body as ServiceInput),
    archive: (id) => servicesApi.cmsArchive(id),
    toBody: (v) => ({
      title: v.title,
      slug: v.slug,
      summary: v.summary,
      description: v.description,
      category: v.category,
      responsibleOffice: v.responsibleOffice,
      eligibility: v.eligibility,
      requiredDocuments: v.requiredDocuments
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      process: v.process
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      contact: v.contact,
      icon: v.icon || 'file',
      coverImage: v.coverImage ?? '',
      status: v.status as ContentStatus,
    }),
  },
  documents: {
    key: 'documents',
    label: 'Documents',
    route: 'documents',
    publicPrefix: '/resources/',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', required: true },
      { key: 'slug', label: 'Slug', kind: 'text', required: true },
      statusField(),
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'year', label: 'Year', kind: 'text' },
      { key: 'fileUrl', label: 'File URL', kind: 'text' },
      { key: 'fileType', label: 'File type', kind: 'text' },
      { key: 'fileSize', label: 'File size', kind: 'text' },
      { key: 'summary', label: 'Summary', kind: 'textarea', rows: 3 },
    ],
    empty: {
      title: '',
      slug: '',
      summary: '',
      category: '',
      year: '',
      fileUrl: '',
      fileType: '',
      fileSize: '',
      status: 'draft',
    },
    list: async () => {
      const items = await documentsApi.cmsList()
      return items.map((i) => ({ id: i.id, title: i.title, slug: i.slug, status: i.status }))
    },
    get: async (id) => {
      const i = await documentsApi.cmsById(id)
      return {
        id: i.id,
        title: i.title,
        slug: i.slug,
        summary: i.summary ?? '',
        category: i.category ?? '',
        year: i.year ?? '',
        fileUrl: i.fileUrl ?? '',
        fileType: i.fileType ?? '',
        fileSize: i.fileSize ?? '',
        status: i.status,
      }
    },
    create: (body) => documentsApi.cmsCreate(body as DocumentInput),
    update: (id, body) => documentsApi.cmsUpdate(id, body as DocumentInput),
    archive: (id) => documentsApi.cmsArchive(id),
    toBody: (v) => ({
      title: v.title,
      slug: v.slug,
      summary: v.summary,
      category: v.category,
      year: v.year,
      fileUrl: v.fileUrl,
      fileType: v.fileType,
      fileSize: v.fileSize,
      status: v.status as ContentStatus,
    }),
  },
}

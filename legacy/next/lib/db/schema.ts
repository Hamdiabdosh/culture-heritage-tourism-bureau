import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { PageTranslations } from '../content/page-translations'

/** Application authorization roles (not Better Auth mechanics). */
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'viewer'])

/** Simple content lifecycle for pages and news. */
export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'published',
  'archived',
])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}

export const institutions = pgTable('institutions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  eyebrow: text('eyebrow'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  hours: text('hours'),
  ...timestamps,
})

/**
 * Application users — also used as Better Auth's user model (`user` → `users`).
 * Role is application authorization only; clients cannot set it via auth input.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('viewer'),
  /** When false, the account cannot use the CMS (sessions are rejected). */
  active: boolean('active').notNull().default(true),
  ...timestamps,
})

/** Better Auth session table. */
export const session = pgTable(
  'session',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
)

/** Better Auth account table (credentials / providers). */
export const account = pgTable(
  'account',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

/** Better Auth verification table. */
export const verification = pgTable(
  'verification',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    /** Optional non-English copy. English stays in title/content — never duplicate `en` here. */
    translations: jsonb('translations').$type<PageTranslations>().notNull().default({}),
    status: contentStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [uniqueIndex('pages_institution_slug_idx').on(table.institutionId, table.slug)],
)

export const news = pgTable(
  'news',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    content: text('content'),
    category: text('category'),
    status: contentStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex('news_institution_slug_idx').on(table.institutionId, table.slug)],
)

export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    description: text('description'),
    category: text('category'),
    responsibleOffice: text('responsible_office'),
    eligibility: text('eligibility'),
    requiredDocuments: text('required_documents').array().notNull().default([]),
    process: text('process').array().notNull().default([]),
    contact: text('contact'),
    icon: text('icon').notNull().default('file'),
    status: contentStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [uniqueIndex('services_institution_slug_idx').on(table.institutionId, table.slug)],
)

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    content: text('content'),
    eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
    location: text('location'),
    type: text('type'),
    status: contentStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [uniqueIndex('events_institution_slug_idx').on(table.institutionId, table.slug)],
)

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    institutionId: uuid('institution_id')
      .notNull()
      .references(() => institutions.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    category: text('category'),
    year: text('year'),
    fileUrl: text('file_url'),
    fileType: text('file_type'),
    fileSize: text('file_size'),
    status: contentStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [uniqueIndex('documents_institution_slug_idx').on(table.institutionId, table.slug)],
)

export type Institution = typeof institutions.$inferSelect
export type NewInstitution = typeof institutions.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
export type News = typeof news.$inferSelect
export type NewNews = typeof news.$inferInsert
export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type AppRole = (typeof userRoleEnum.enumValues)[number]

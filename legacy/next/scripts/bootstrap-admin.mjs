/**
 * Provision (or reset) a CMS admin account.
 * Run: pnpm db:bootstrap-admin
 *
 * Local development — optional env, with safe defaults:
 *   ADMIN_EMAIL=admin@example.gov.et
 *   ADMIN_PASSWORD=Admin123!
 *   ADMIN_NAME=CMS Admin
 *
 * Production — ADMIN_EMAIL and ADMIN_PASSWORD are required (no defaults).
 */
import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { hashPassword } from 'better-auth/crypto'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const isProduction = process.env.NODE_ENV === 'production'

let email = process.env.ADMIN_EMAIL
let password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME ?? 'CMS Admin'

if (isProduction) {
  if (!email) {
    console.error('ADMIN_EMAIL must be set in production.')
    process.exit(1)
  }
  if (!password) {
    console.error('ADMIN_PASSWORD must be set in production.')
    process.exit(1)
  }
} else {
  email = email ?? 'admin@example.gov.et'
  password = password ?? 'Admin123!'
}

if (password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.')
  process.exit(1)
}

const sql = postgres(url)
const hashed = await hashPassword(password)
const now = new Date()

const existing = await sql`
  select id from users where email = ${email} limit 1
`

let userId = existing[0]?.id

if (userId) {
  await sql`
    update users
    set name = ${name}, role = 'admin', active = true, updated_at = ${now}
    where id = ${userId}
  `
  const acct = await sql`
    select id from account
    where user_id = ${userId} and provider_id = 'credential'
    limit 1
  `
  if (acct[0]) {
    await sql`
      update account
      set password = ${hashed}, updated_at = ${now}
      where id = ${acct[0].id}
    `
  } else {
    await sql`
      insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
      values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hashed}, ${now}, ${now})
    `
  }
  console.log('Admin updated.')
} else {
  userId = randomUUID()
  await sql`
    insert into users (id, name, email, email_verified, role, active, created_at, updated_at)
    values (${userId}, ${name}, ${email}, true, 'admin', true, ${now}, ${now})
  `
  await sql`
    insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
    values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hashed}, ${now}, ${now})
  `
  console.log('Admin created.')
}

console.log(`Email: ${email}`)
if (!isProduction) {
  console.log(`Password: ${password}`)
}
console.log('Sign in at /login then open /cms')
await sql.end()

/**
 * Explicit one-time bootstrap for the active institution row.
 * Run: pnpm db:bootstrap-institution
 *
 * Prints INSTITUTION_ID for .env. Never called by CMS reads.
 */
import 'dotenv/config'
import postgres from 'postgres'
import { institutionConfig } from '../lib/institution-config.ts'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const sql = postgres(url)
const { institution } = institutionConfig

const existing = await sql`
  select id
  from institutions
  where short_name = ${institution.shortName}
  limit 1
`

if (existing[0]) {
  console.log('Institution already exists.')
  console.log(`INSTITUTION_ID=${existing[0].id}`)
  await sql.end()
  process.exit(0)
}

const created = await sql`
  insert into institutions (
    name, short_name, tagline, description, eyebrow, address, phone, email, hours
  ) values (
    ${institution.name},
    ${institution.shortName},
    ${institution.tagline},
    ${institution.description},
    ${institution.eyebrow},
    ${institution.address},
    ${institution.phone},
    ${institution.email},
    ${institution.hours}
  )
  returning id
`

console.log('Institution created from institution-config.')
console.log(`INSTITUTION_ID=${created[0].id}`)
console.log('Add the line above to your .env file.')
await sql.end()

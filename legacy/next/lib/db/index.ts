import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export * from './schema'
export { schema }

type Db = ReturnType<typeof drizzle<typeof schema>>

let client: ReturnType<typeof postgres> | undefined
let instance: Db | undefined

/**
 * Single database entry point.
 * Connects on first use. Requires DATABASE_URL.
 * Not wired to the frontend in Batch 03.
 */
export function getDb(): Db {
  if (instance) return instance

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  client = postgres(url)
  instance = drizzle(client, { schema })
  return instance
}

/** Lazy proxy so importing this module does not require DATABASE_URL until used. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})

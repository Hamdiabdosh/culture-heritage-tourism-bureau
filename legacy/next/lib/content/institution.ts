import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { institutions, type Institution } from '@/lib/db/schema'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class InstitutionConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InstitutionConfigError'
  }
}

/**
 * Read-only lookup of the active institution.
 * Does not insert or sync anything — configure INSTITUTION_ID explicitly.
 */
export async function getActiveInstitution(): Promise<Institution> {
  const institutionId = process.env.INSTITUTION_ID?.trim()

  if (!institutionId) {
    throw new InstitutionConfigError(
      'INSTITUTION_ID is not set. Set it in the environment to an existing institutions.id value.',
    )
  }

  if (!UUID_PATTERN.test(institutionId)) {
    throw new InstitutionConfigError(
      'INSTITUTION_ID is not a valid UUID. Check the value in your environment.',
    )
  }

  const rows = await db
    .select()
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .limit(1)

  const institution = rows[0]
  if (!institution) {
    throw new InstitutionConfigError(
      `Configured INSTITUTION_ID (${institutionId}) does not exist in the institutions table.`,
    )
  }

  return institution
}

export async function getActiveInstitutionId(): Promise<string> {
  const institution = await getActiveInstitution()
  return institution.id
}

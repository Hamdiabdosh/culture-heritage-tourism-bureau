import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, users, type AppRole, type User } from '@/lib/db/schema'

export const APP_ROLES = ['admin', 'editor', 'viewer'] as const

export function isAppRole(value: unknown): value is AppRole {
  return value === 'admin' || value === 'editor' || value === 'viewer'
}

export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(users.createdAt)
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user
}

export async function countActiveAdmins(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.active, true)))

  return Number(row?.value ?? 0)
}

/** True when applying this change would leave zero active admins. */
export async function wouldRemoveLastActiveAdmin(
  user: User,
  change: { role?: AppRole; active?: boolean },
): Promise<boolean> {
  if (user.role !== 'admin' || !user.active) return false

  const demoting = change.role !== undefined && change.role !== 'admin'
  const deactivating = change.active === false
  if (!demoting && !deactivating) return false

  return (await countActiveAdmins()) <= 1
}

export async function updateUserRole(userId: string, role: AppRole): Promise<void> {
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

export async function updateUserActive(userId: string, active: boolean): Promise<void> {
  await db
    .update(users)
    .set({ active, updatedAt: new Date() })
    .where(eq(users.id, userId))

  // Drop sessions so deactivated users cannot keep using the CMS.
  if (!active) {
    await db.delete(session).where(eq(session.userId, userId))
  }
}

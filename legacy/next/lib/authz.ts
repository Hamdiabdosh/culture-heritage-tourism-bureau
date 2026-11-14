import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { AppRole } from '@/lib/db/schema'
import type { PageStatus } from '@/lib/content/page-fields'

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

function normalizeRole(role: unknown): AppRole {
  if (role === 'admin' || role === 'editor' || role === 'viewer') return role
  return 'viewer'
}

/** Read role from the server session user — never from the client. */
export function getSessionRole(session: AuthSession): AppRole {
  return normalizeRole(session.user.role)
}

/** True when the account may use the CMS (missing/legacy values count as active). */
export function isUserActive(session: AuthSession): boolean {
  return session.user.active !== false
}

async function signOutQuietly() {
  try {
    await auth.api.signOut({ headers: await headers() })
  } catch {
    // Session may already be gone.
  }
}

/**
 * Load the current session, treating inactive accounts as signed out.
 * Prefer this over calling auth.api.getSession directly in CMS code.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return null

  if (!isUserActive(session)) {
    await signOutQuietly()
    return null
  }

  return session
}

/** Require a valid authenticated (and active) session. Redirects to login if missing. */
export async function requireSession(nextPath?: string): Promise<AuthSession> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    const login = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'
    redirect(login)
  }

  if (!isUserActive(session)) {
    await signOutQuietly()
    redirect('/login?error=account_inactive')
  }

  return session
}

/** Require one of the allowed application roles. */
export async function requireRole(
  allowed: readonly AppRole[],
  options?: { nextPath?: string; forbiddenPath?: string },
): Promise<AuthSession> {
  const session = await requireSession(options?.nextPath)
  const role = getSessionRole(session)

  if (!allowed.includes(role)) {
    redirect(options?.forbiddenPath ?? '/cms?error=forbidden')
  }

  return session
}

export async function requireAdmin(options?: { nextPath?: string }) {
  return requireRole(['admin'], {
    nextPath: options?.nextPath,
    forbiddenPath: '/cms?error=forbidden',
  })
}

/** Editors and admins may perform content-management operations. */
export async function requireEditorOrAdmin(options?: { nextPath?: string }) {
  return requireRole(['admin', 'editor'], {
    nextPath: options?.nextPath,
    forbiddenPath: '/cms?error=forbidden',
  })
}

/** True when the role may modify CMS content. */
export function canModifyContent(role: AppRole): boolean {
  return role === 'admin' || role === 'editor'
}

/** Only administrators may publish content. Editors must submit changes for review. */
export function canPublishContent(role: AppRole): boolean {
  return role === 'admin'
}

/** Prevent editors from publishing directly or silently changing live content. */
export function enforcePublishingGate(
  role: AppRole,
  requestedStatus: PageStatus,
  existingStatus?: PageStatus | null,
): PageStatus {
  if (canPublishContent(role)) return requestedStatus
  if (requestedStatus === 'published' || existingStatus === 'published') return 'draft'
  return requestedStatus
}

/** True when the role has full administrative access. */
export function canAdminister(role: AppRole): boolean {
  return role === 'admin'
}

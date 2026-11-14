'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { canAdminister, getAuthSession, getSessionRole } from '@/lib/authz'
import {
  getUserById,
  isAppRole,
  updateUserActive,
  updateUserRole,
  wouldRemoveLastActiveAdmin,
} from '@/lib/cms/users'

async function requireAdminMutation() {
  const t = await getTranslations('cms.users')
  const session = await getAuthSession()

  if (!session) {
    return { ok: false as const, error: t('mustSignIn') }
  }

  if (!canAdminister(getSessionRole(session))) {
    return { ok: false as const, error: t('onlyAdmins') }
  }

  return { ok: true as const, session }
}

function revalidateUsers() {
  revalidatePath('/cms/users')
}

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const t = await getTranslations('cms.users')
  const access = await requireAdminMutation()
  if (!access.ok) {
    redirect(`/cms/users?error=${encodeURIComponent(access.error)}`)
  }

  const userId = String(formData.get('userId') ?? '')
  const roleRaw = String(formData.get('role') ?? '')

  if (!userId || !isAppRole(roleRaw)) {
    redirect(`/cms/users?error=${encodeURIComponent(t('invalidRole'))}`)
  }

  const user = await getUserById(userId)
  if (!user) {
    redirect(`/cms/users?error=${encodeURIComponent(t('userNotFound'))}`)
  }

  if (user.role === roleRaw) {
    redirect('/cms/users')
  }

  if (await wouldRemoveLastActiveAdmin(user, { role: roleRaw })) {
    redirect(`/cms/users?error=${encodeURIComponent(t('lastAdmin'))}`)
  }

  await updateUserRole(userId, roleRaw)
  revalidateUsers()
  redirect(`/cms/users?updated=${encodeURIComponent(t('roleUpdated'))}`)
}

export async function updateUserActiveAction(formData: FormData): Promise<void> {
  const t = await getTranslations('cms.users')
  const access = await requireAdminMutation()
  if (!access.ok) {
    redirect(`/cms/users?error=${encodeURIComponent(access.error)}`)
  }

  const userId = String(formData.get('userId') ?? '')
  const activeRaw = String(formData.get('active') ?? '')
  const active = activeRaw === 'true'

  if (!userId || (activeRaw !== 'true' && activeRaw !== 'false')) {
    redirect(`/cms/users?error=${encodeURIComponent(t('invalidStatus'))}`)
  }

  const user = await getUserById(userId)
  if (!user) {
    redirect(`/cms/users?error=${encodeURIComponent(t('userNotFound'))}`)
  }

  if (user.active === active) {
    redirect('/cms/users')
  }

  if (await wouldRemoveLastActiveAdmin(user, { active })) {
    redirect(`/cms/users?error=${encodeURIComponent(t('lastAdmin'))}`)
  }

  await updateUserActive(userId, active)

  // If the admin deactivated themselves, end this session too.
  if (!active && access.session.user.id === userId) {
    try {
      await auth.api.signOut({ headers: await headers() })
    } catch {
      // ignore
    }
    redirect('/login?error=account_inactive')
  }

  revalidateUsers()
  redirect(
    `/cms/users?updated=${encodeURIComponent(
      active ? t('userActivated') : t('userDeactivated'),
    )}`,
  )
}

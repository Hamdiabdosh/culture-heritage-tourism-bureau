import Link from 'next/link'
import { Landmark } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { institution } from '@/lib/institution-config'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: `Sign in | ${institution.shortName}`,
  description: 'Sign in to the institution administration area.',
}

/** Same-origin path only — rejects //…, absolute URLs, and non-path values. */
function safeLoginNextPath(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/cms'
  }
  return next
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const params = await searchParams
  const nextPath = safeLoginNextPath(params.next)

  // Inactive accounts must not stay signed in via the login page bounce.
  if (session && session.user.active === false) {
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined)
  } else if (session) {
    redirect(nextPath)
  }

  const inactiveNotice =
    params.error === 'account_inactive'
      ? 'This account is inactive. Contact an administrator.'
      : null

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <Landmark size={22} />
          </span>
          <div>
            <strong>{institution.name}</strong>
            <small>Administration sign in</small>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="login-copy">Use your institution account to access the administration area.</p>
        {inactiveNotice ? (
          <p className="login-error" role="alert">
            {inactiveNotice}
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} />
        <p className="login-back">
          <Link href="/">← Back to public website</Link>
        </p>
      </div>
    </main>
  )
}

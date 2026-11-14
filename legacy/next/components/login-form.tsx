'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { BuiltByRaafat } from '@/src/components/brand/built-by-raafat'

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const result = await authClient.signIn.email({
      email: email.trim(),
      password,
    })

    setPending(false)

    if (result.error) {
      setError(result.error.message || 'Invalid email or password.')
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label>
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.gov.et"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
      </label>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-dark" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      <BuiltByRaafat className="login-credit" linkClassName="login-credit-link" />
    </form>
  )
}

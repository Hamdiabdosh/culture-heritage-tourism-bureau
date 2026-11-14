import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '../components/brand/brand-logo'
import { BuiltByRaafat } from '../components/brand/built-by-raafat'
import { ApiClientError, authApi } from '../lib/api-client'
import { useT } from '../lib/i18n'
import { useDocumentTitle } from '../lib/use-document-title'

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/cms'
  return raw
}

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const nextPath = safeNext(params.get('next'))
  const t = useT('cms.auth')
  const tFooter = useT('footer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useDocumentTitle(t('title'))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await authApi.login(email.trim(), password)
      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('failed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <BrandLogo />
          <div>
            <strong>{t('heading')}</strong>
            <small>{t('sub')}</small>
          </div>
        </div>
        <h1>{t('title')}</h1>
        <p className="login-copy">{t('copy')}</p>
        <form className="login-form" onSubmit={onSubmit}>
          <label>
            {t('email')}
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t('password')}
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button-dark" type="submit" disabled={pending}>
            {pending ? t('submitting') : t('submit')}
          </button>
          <BuiltByRaafat
            className="login-credit"
            linkClassName="login-credit-link"
            prefix={tFooter('builtBy')}
          />
        </form>
        <p className="login-back">
          <Link to="/">{t('back')}</Link>
        </p>
      </div>
    </main>
  )
}

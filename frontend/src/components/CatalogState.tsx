import { Link } from 'react-router-dom'

type Props = {
  loading?: boolean
  error?: string | null
  empty?: boolean
  noMatch?: boolean
  emptyTitle: string
  emptyBody: string
  loadErrorTitle: string
  tryAgainLabel: string
  noMatchLabel: string
  onRetry?: () => void
  emptyCtaTo?: string
  emptyCtaLabel?: string
  skeletonCount?: number
}

/** Shared loading / error / empty / no-match for public catalogs. */
export function CatalogState({
  loading,
  error,
  empty,
  noMatch,
  emptyTitle,
  emptyBody,
  loadErrorTitle,
  tryAgainLabel,
  noMatchLabel,
  onRetry,
  emptyCtaTo = '/contact',
  emptyCtaLabel,
  skeletonCount = 3,
}: Props) {
  if (loading) {
    return (
      <div className="directory-loading" aria-busy="true" aria-live="polite">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="directory-empty" role="alert">
        <h2>{loadErrorTitle}</h2>
        <p className="muted">{error}</p>
        {onRetry ? (
          <button type="button" className="button button-dark" onClick={onRetry}>
            {tryAgainLabel}
          </button>
        ) : null}
      </div>
    )
  }

  if (empty) {
    return (
      <div className="directory-empty">
        <h2>{emptyTitle}</h2>
        <p className="muted">{emptyBody}</p>
        {emptyCtaLabel ? (
          <Link className="button button-dark" to={emptyCtaTo}>
            {emptyCtaLabel}
          </Link>
        ) : null}
      </div>
    )
  }

  if (noMatch) {
    return <p className="muted directory-empty-inline">{noMatchLabel}</p>
  }

  return null
}

export function DetailNotFound({
  title,
  body,
  backTo,
  backLabel,
  homeLabel,
}: {
  title: string
  body?: string
  backTo: string
  backLabel: string
  homeLabel: string
}) {
  return (
    <main id="main-content" className="inner-page container page-intro">
      <h1>{title}</h1>
      {body ? <p>{body}</p> : null}
      <div className="hero-actions" style={{ marginTop: 24 }}>
        <Link className="button button-dark" to={backTo}>
          {backLabel}
        </Link>
        <Link className="button button-outline" to="/">
          {homeLabel}
        </Link>
      </div>
    </main>
  )
}

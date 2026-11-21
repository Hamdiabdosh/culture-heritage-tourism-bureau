/**
 * Institutional wordmark mark — no invented seal.
 * Replace with an official Bureau logo asset when one is supplied.
 */
export function BrandLogo({
  className = 'brand-logo',
  size = 42,
}: {
  className?: string
  size?: number
}) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: 8,
        background: '#2c1f1a',
        color: '#e8b923',
        font: `700 ${Math.max(10, Math.round(size * 0.28))}px/1 Georgia, "Noto Serif", serif`,
        letterSpacing: '0.04em',
        flex: 'none',
      }}
      aria-hidden
    >
      CHTB
    </span>
  )
}

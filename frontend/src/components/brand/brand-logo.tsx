/** VisitHarar Jugol gate mark — public asset under /brand/ */
export function BrandLogo({
  className = 'brand-logo',
  size = 42,
}: {
  className?: string
  size?: number
}) {
  return (
    <img
      src="/brand/visit-harar-logo.webp"
      alt=""
      className={className}
      width={size}
      height={size}
      decoding="async"
    />
  )
}

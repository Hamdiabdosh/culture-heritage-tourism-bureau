/** Cover image or branded gradient fallback (no fake Harar stock). */
export function CoverMedia({
  src,
  alt = '',
  className = '',
  ratio = 'card',
}: {
  src?: string | null
  alt?: string
  className?: string
  ratio?: 'card' | 'hero' | 'thumb'
}) {
  const hasSrc = Boolean(src?.trim())
  return (
    <div className={`cover-media cover-media-${ratio} ${className}`.trim()} aria-hidden={!alt}>
      {hasSrc ? (
        <img src={src!} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <div className="cover-media-fallback" />
      )}
    </div>
  )
}

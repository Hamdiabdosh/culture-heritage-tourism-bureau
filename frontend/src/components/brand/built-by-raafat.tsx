type Props = {
  className?: string
  linkClassName?: string
  /** Localized “Built by” / “Built with care by” prefix. */
  prefix?: string
}

export function BuiltByRaafat({
  className = 'built-by-raafat',
  linkClassName = 'built-by-raafat-link',
  prefix = 'Built by',
}: Props) {
  return (
    <p className={className}>
      {prefix}{' '}
      <a
        href="https://raafat.site"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        RAAFAT-Technolgies
      </a>
    </p>
  )
}

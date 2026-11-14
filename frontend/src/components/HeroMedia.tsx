import { useEffect, useState } from 'react'
import { siteTemplate } from '../lib/site-template'

/** Full-bleed auto-advancing hero. Slides configured in `site-template.ts`. */
export function HeroMedia() {
  const slides = siteTemplate.heroSlides
  const [index, setIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    function onChange() {
      setReduceMotion(mq.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduceMotion || slides.length < 2) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, siteTemplate.heroIntervalMs)
    return () => window.clearInterval(id)
  }, [reduceMotion, slides.length])

  if (slides.length === 0) return null

  return (
    <div className="hero-media">
      <div className="hero-media-slides" aria-hidden>
        {slides.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            className={i === index ? 'is-active' : undefined}
            decoding="async"
            fetchPriority={i === 0 ? 'high' : 'low'}
          />
        ))}
        <div className="hero-media-veil" />
      </div>
      {!reduceMotion && slides.length > 1 ? (
        <div className="hero-media-dots" role="group" aria-label="Hero slides">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              className={i === index ? 'is-active' : undefined}
              aria-label={`Show slide ${i + 1} of ${slides.length}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

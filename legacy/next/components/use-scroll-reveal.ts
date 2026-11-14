'use client'

import { useEffect } from 'react'

function isAlreadyInView(el: HTMLElement, threshold = 0.2) {
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight
  const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0)
  if (visible <= 0 || rect.height <= 0) return false
  return visible / Math.min(rect.height, vh) >= threshold
}

/**
 * One observer for all `.reveal` nodes on the current public page.
 * Marks each target `.is-visible` once (~20% visible), then unobserves.
 * Reduced-motion / no-JS: content stays visible (see globals.css).
 */
export function useScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'))
    if (nodes.length === 0) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const el of nodes) el.classList.add('is-visible')
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.2 },
    )

    // Mark in-view nodes before hiding, so above-fold content does not flash.
    for (const el of nodes) {
      if (isAlreadyInView(el)) el.classList.add('is-visible')
      else io.observe(el)
    }

    document.documentElement.classList.add('reveal-ready')

    return () => {
      io.disconnect()
      document.documentElement.classList.remove('reveal-ready')
    }
  }, [])
}

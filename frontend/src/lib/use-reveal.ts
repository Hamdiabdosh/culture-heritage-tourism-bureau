import { useEffect } from 'react'

/**
 * Activates CSS scroll reveals (`.reveal` → `.is-visible`) on public pages.
 * Watches for late-mounted nodes (async home grids). No-op when reduced motion.
 */
export function useReveal(routeKey: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.remove('reveal-ready')
      return
    }

    document.documentElement.classList.add('reveal-ready')

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    function watch(root: ParentNode = document) {
      root.querySelectorAll?.('.reveal:not(.is-visible)').forEach((el) => io.observe(el))
    }

    watch()

    // ponytail: MutationObserver ceiling is fine for SPA outlet swaps; upgrade to route-scoped refs if noisy
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches('.reveal:not(.is-visible)')) io.observe(node)
          watch(node)
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [routeKey])
}

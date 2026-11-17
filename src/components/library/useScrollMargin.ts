import { type RefObject, useLayoutEffect, useState } from 'react'
import { useScrollElement } from '@/components/layout/scrollElement'

/**
 * Distance from the top of the scroll container's content to `ref`, i.e.
 * how much page content sits above a virtual list. Re-measured whenever the
 * content above it resizes (headers loading, etc.).
 */
export function useScrollMargin(ref: RefObject<HTMLElement | null>): number {
  const scrollEl = useScrollElement()
  const [margin, setMargin] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !scrollEl) return
    const measure = () =>
      setMargin(el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop)
    measure()
    const ro = new ResizeObserver(measure)
    // Watch the page content (<main>): anything above the list growing/shrinking resizes it.
    const content = scrollEl.querySelector('[data-scroll-content]')
    if (content) ro.observe(content)
    return () => ro.disconnect()
  }, [ref, scrollEl])

  return margin
}

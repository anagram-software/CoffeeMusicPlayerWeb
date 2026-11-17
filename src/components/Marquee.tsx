import { type ElementType, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const SPEED_PX_PER_S = 40
const PAUSE_MS = 1500
/** How soon scrolling starts after the hover begins. */
const START_DELAY_MS = 500
/**
 * Right padding (1.5rem) while scrolling, so the end of the text clears the faded
 * right edge. Nothing is added on the left: the text must not move when scrolling starts.
 */
const END_PADDING_PX = 24

/**
 * Single-line text. When it doesn't fit it's cut off with "…", and hovering
 * (or tapping, on touch screens) scrolls it to reveal the end, pauses and
 * scrolls back. Never animates for users who prefer reduced motion. The full
 * text is always available as a tooltip.
 */
export function Marquee({
  children,
  title,
  as: Tag = 'div',
  className,
}: {
  children: ReactNode
  /** Tooltip / accessible full text. */
  title?: string
  as?: ElementType
  className?: string
}) {
  const innerRef = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(0)
  const [active, setActive] = useState(false)
  const animating = active && overflow > 0

  // Measure while truncated (not animating): the hidden part's width is how far to scroll.
  useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner || animating) return
    const measure = () => setOverflow(Math.max(0, Math.ceil(inner.scrollWidth - inner.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [children, animating])

  // Scroll there, pause, scroll back, pause: Web Animations, so the pauses are exact whatever the length.
  useEffect(() => {
    const inner = innerRef.current
    if (!inner || !animating || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const distance = overflow + END_PADDING_PX
    const travel = (distance / SPEED_PX_PER_S) * 1000
    const total = 2 * travel + 2 * PAUSE_MS
    const at = (ms: number) => ms / total
    const animation = inner.animate(
      [
        { transform: 'translateX(0)', offset: 0, easing: 'ease-in-out' },
        { transform: `translateX(-${distance}px)`, offset: at(travel) },
        { transform: `translateX(-${distance}px)`, offset: at(travel + PAUSE_MS), easing: 'ease-in-out' },
        { transform: 'translateX(0)', offset: at(2 * travel + PAUSE_MS) },
        { transform: 'translateX(0)', offset: 1 },
      ],
      { duration: total, iterations: Infinity, delay: START_DELAY_MS },
    )
    return () => animation.cancel()
  }, [animating, overflow])

  return (
    <Tag
      title={title}
      onPointerEnter={(e: React.PointerEvent) => e.pointerType === 'mouse' && setActive(true)}
      onPointerLeave={(e: React.PointerEvent) => e.pointerType === 'mouse' && setActive(false)}
      onClick={(e: React.MouseEvent) => {
        // Touch screens have no hover: a tap toggles the scroll instead.
        if ((e.nativeEvent as PointerEvent).pointerType === 'touch') setActive((a) => !a)
      }}
      className={cn(
        'max-w-full overflow-hidden whitespace-nowrap',
        animating && 'motion-safe:[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]',
        className,
      )}
    >
      <span
        ref={innerRef}
        className={cn(
          'block max-w-full truncate',
          animating &&
            'motion-safe:inline-block motion-safe:max-w-none motion-safe:overflow-visible motion-safe:pr-6',
        )}
      >
        {children}
      </span>
    </Tag>
  )
}

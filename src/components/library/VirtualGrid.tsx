import { useVirtualizer } from '@tanstack/react-virtual'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useScrollElement } from '@/components/layout/scrollElement'
import { useScrollMargin } from './useScrollMargin'

interface VirtualGridProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  /** Columns are as many as fit at this minimum width. */
  minItemWidth?: number
  gap?: number
  /** Extra row height beyond the square item width (e.g. captions below the art). */
  extraHeight?: number
  hasMore?: boolean
  onLoadMore?: () => void
}

/** A responsive grid of square-ish cards that only renders visible rows. */
export function VirtualGrid<T>({
  items,
  getKey,
  renderItem,
  minItemWidth = 160,
  gap = 16,
  extraHeight = 0,
  hasMore,
  onLoadMore,
}: VirtualGridProps<T>) {
  const scrollEl = useScrollElement()
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const scrollMargin = useScrollMargin(ref)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const columns = Math.max(1, Math.floor((width + gap) / (minItemWidth + gap)))
  const itemWidth = width > 0 ? (width - gap * (columns - 1)) / columns : minItemWidth
  const rowHeight = itemWidth + extraHeight + gap
  const rowCount = Math.ceil(items.length / columns)

  // oxlint-disable-next-line react/incompatible-library -- virtualizer opts out of compiler memoisation; fine here
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollEl,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin,
  })

  // Row height depends on the container width; re-measure when it changes.
  useEffect(() => virtualizer.measure(), [virtualizer, rowHeight])

  const rows = virtualizer.getVirtualItems()
  const lastRow = rows.at(-1)?.index ?? -1
  useEffect(() => {
    if (hasMore && lastRow >= rowCount - 3) onLoadMore?.()
  }, [hasMore, lastRow, rowCount, onLoadMore])

  return (
    <div ref={ref} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {rows.map((row) => (
        <div
          key={row.key}
          className="absolute top-0 left-0 grid w-full"
          style={{
            transform: `translateY(${row.start - scrollMargin}px)`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            columnGap: gap,
          }}
        >
          {items.slice(row.index * columns, (row.index + 1) * columns).map((item) => (
            <div key={getKey(item)}>{renderItem(item)}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

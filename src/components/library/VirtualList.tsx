import { useVirtualizer } from '@tanstack/react-virtual'
import { type ReactNode, useEffect, useRef } from 'react'
import { useScrollElement } from '@/components/layout/scrollElement'
import { useScrollMargin } from './useScrollMargin'

interface VirtualListProps<T> {
  items: T[]
  getKey: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactNode
  rowHeight: number
  hasMore?: boolean
  onLoadMore?: () => void
}

/** A fixed-row-height list that only renders visible rows. */
export function VirtualList<T>({ items, getKey, renderItem, rowHeight, hasMore, onLoadMore }: VirtualListProps<T>) {
  const scrollEl = useScrollElement()
  const ref = useRef<HTMLDivElement>(null)
  const scrollMargin = useScrollMargin(ref)

  // oxlint-disable-next-line react/incompatible-library -- virtualizer opts out of compiler memoisation; fine here
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => rowHeight,
    getItemKey: (i) => getKey(items[i], i),
    overscan: 8,
    scrollMargin,
  })

  const rows = virtualizer.getVirtualItems()
  const last = rows.at(-1)?.index ?? -1
  useEffect(() => {
    if (hasMore && last >= items.length - 20) onLoadMore?.()
  }, [hasMore, last, items.length, onLoadMore])

  return (
    <div ref={ref} role="list" className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {rows.map((row) => (
        <div
          key={row.key}
          role="listitem"
          className="absolute top-0 left-0 w-full"
          style={{ height: rowHeight, transform: `translateY(${row.start - scrollMargin}px)` }}
        >
          {renderItem(items[row.index], row.index)}
        </div>
      ))}
    </div>
  )
}

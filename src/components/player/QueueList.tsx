import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef } from 'react'
import { MdClose, MdDragHandle } from 'react-icons/md'
import { CoverArt } from '@/components/CoverArt'
import { PlayingBars } from '@/components/PlayingBars'
import { Button } from '@/components/ui/button'
import { formatDuration, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { player } from '@/player/engine'
import type { QueueItem } from '@/player/queue'
import { usePlayerStore } from '@/player/store'

/** The play queue: drag to reorder, click to jump, × to remove. */
export function QueueList({ className }: { className?: string }) {
  const queue = usePlayerStore((s) => s.queue)
  const index = usePlayerStore((s) => s.index)
  const currentRef = useRef<HTMLLIElement>(null)

  const sensors = useSensors(
    // A small distance threshold keeps plain clicks working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Bring the current track into view when the queue opens.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = queue.findIndex((i) => i.qid === active.id)
    const to = queue.findIndex((i) => i.qid === over.id)
    if (from !== -1 && to !== -1) player.move(from, to)
  }

  const remaining = queue.slice(index).reduce((t, i) => t + (i.track.duration ?? 0), 0)

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs text-foreground/60">
            {plural(queue.length, 'song')} · {formatDuration(remaining)} left
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => player.clear()} disabled={queue.length === 0} className="text-foreground/70">
          Clear
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={queue.map((i) => i.qid)} strategy={verticalListSortingStrategy}>
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {queue.map((item, i) => (
              <QueueRow key={item.qid} item={item} index={i} state={i < index ? 'played' : i === index ? 'current' : 'upcoming'} ref={i === index ? currentRef : undefined} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function QueueRow({
  item,
  index,
  state,
  ref,
}: {
  item: QueueItem
  index: number
  state: 'played' | 'current' | 'upcoming'
  ref?: React.Ref<HTMLLIElement>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.qid })
  const playing = usePlayerStore((s) => s.playing)
  const { track } = item

  return (
    <li
      ref={(node) => {
        setNodeRef(node)
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group relative flex h-14 items-center gap-3 rounded-md px-2 hover:bg-foreground/10',
        state === 'played' && 'opacity-50',
        state === 'current' && 'bg-foreground/10',
        isDragging && 'z-10 bg-foreground/15 shadow-lg',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => player.jumpTo(index)}
        aria-label={`Play ${track.title}`}
      >
        <div className="relative size-10 shrink-0">
          <CoverArt id={track.coverArt} size={80} className="size-full rounded" />
          {state === 'current' && (
            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
              <PlayingBars playing={playing} barClassName="bg-white" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className={cn('truncate text-sm text-foreground', state === 'current' && 'font-medium')}>{track.title}</div>
          <div className="truncate text-xs text-foreground/60">{track.artist}</div>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => player.remove(item.qid)}
        aria-label={`Remove ${track.title} from queue`}
        className="text-foreground/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
      >
        <MdClose className="size-4" />
      </Button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${track.title}`}
        className="cursor-grab touch-none rounded p-1 text-foreground/50 hover:text-foreground active:cursor-grabbing"
      >
        <MdDragHandle className="size-5" />
      </button>
    </li>
  )
}

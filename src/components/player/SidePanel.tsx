import { MdClose, MdClosedCaption, MdQueueMusic } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCurrentTrack, usePlayerStore } from '@/player/store'
import { LyricsView } from './LyricsView'
import { QueueList } from './QueueList'
import type { Panel } from './sidePanelState'

/**
 * The queue or the lyrics, one at a time, in a panel on the right of the
 * app: docked beside the content on wide screens, a slide-over sheet on
 * narrow ones (see AppShell). Opened from the player bar or the full player.
 */
export function SidePanel({ className }: { className?: string }) {
  const panel = usePlayerStore((s) => s.panel)
  const track = useCurrentTrack()
  if (!panel) return null

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
        <PanelTab id="queue" current={panel} label="Queue" icon={MdQueueMusic} />
        <PanelTab id="lyrics" current={panel} label="Lyrics" icon={MdClosedCaption} />
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={() => usePlayerStore.setState({ panel: null })} aria-label="Close panel">
          <MdClose className="size-5" />
        </Button>
      </div>

      {panel === 'queue' ? (
        <QueueList className="min-h-0 flex-1" />
      ) : track ? (
        <LyricsView track={track} className="mt-2 min-h-0 flex-1 rounded-none bg-transparent" />
      ) : (
        <p className="p-8 text-center text-sm text-muted-foreground">Nothing playing</p>
      )}
    </div>
  )
}

function PanelTab({ id, current, label, icon: Icon }: { id: Panel; current: Panel; label: string; icon: typeof MdClosedCaption }) {
  const active = id === current
  return (
    <button
      type="button"
      onClick={() => usePlayerStore.setState({ panel: id })}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium tracking-wider uppercase transition-colors',
        active ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  )
}

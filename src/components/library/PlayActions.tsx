import { MdPlayArrow, MdShuffle } from 'react-icons/md'
import { StarButton } from '@/components/StarButton'
import { Button } from '@/components/ui/button'
import type { StarKind } from '@/lib/subsonic/stars'
import { player } from '@/player/engine'
import type { Track } from '@/player/queue'
import { TrackMenu } from './TrackMenu'

/** Play / Shuffle / ⋮ buttons for detail page headers. */
export function PlayActions({
  tracks,
  disabled,
  star,
  afterShuffle,
  children,
}: {
  tracks: Track[]
  disabled?: boolean
  /** Shows a heart for the album/artist itself. */
  star?: { kind: StarKind; id: string; starred: unknown }
  /** Buttons placed right after Shuffle (e.g. "Add to library"). */
  afterShuffle?: React.ReactNode
  /** Extra buttons at the end (e.g. a playlist's edit menu). */
  children?: React.ReactNode
}) {
  const empty = disabled || tracks.length === 0
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      <Button size="lg" className="h-10 rounded-full px-5 uppercase tracking-wider" disabled={empty} onClick={() => player.playQueue(tracks, 0, { shuffle: false })}>
        <MdPlayArrow className="size-5" /> Play
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-10 rounded-full border-foreground/30 bg-transparent px-5 tracking-wider text-foreground uppercase hover:bg-foreground/10"
        disabled={empty}
        onClick={() => player.playQueue(tracks, Math.floor(Math.random() * tracks.length), { shuffle: true })}
      >
        <MdShuffle className="size-5" /> Shuffle
      </Button>
      {afterShuffle}
      {star && <StarButton {...star} />}
      {!empty && <TrackMenu getTracks={() => tracks} className="text-foreground" />}
      {children}
    </div>
  )
}

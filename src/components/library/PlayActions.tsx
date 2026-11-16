import { MdPlayArrow, MdShuffle } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { player } from '@/player/engine'
import type { Track } from '@/player/queue'
import { TrackMenu } from './TrackMenu'

/** Play / Shuffle / ⋮ buttons for detail page headers. */
export function PlayActions({ tracks, disabled }: { tracks: Track[]; disabled?: boolean }) {
  const empty = disabled || tracks.length === 0
  return (
    <div className="mt-3 flex items-center gap-2">
      <Button size="lg" className="h-10 rounded-full px-5 uppercase tracking-wider" disabled={empty} onClick={() => player.playQueue(tracks, 0, { shuffle: false })}>
        <MdPlayArrow className="size-5" /> Play
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-10 rounded-full border-white/30 bg-transparent px-5 tracking-wider text-white uppercase hover:bg-white/10"
        disabled={empty}
        onClick={() => player.playQueue(tracks, Math.floor(Math.random() * tracks.length), { shuffle: true })}
      >
        <MdShuffle className="size-5" /> Shuffle
      </Button>
      {!empty && <TrackMenu getTracks={() => tracks} className="text-white" />}
    </div>
  )
}

import { useQueryClient } from '@tanstack/react-query'
import { MdMoreHoriz, MdPlayArrow, MdShuffle } from 'react-icons/md'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { type PlaylistInfo, playlistQuery } from '@/lib/subsonic/queries'
import { cn } from '@/lib/utils'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { useSubsonic } from '@/stores/session'

interface PlaylistPlayMenuProps {
  playlist: PlaylistInfo
  /** Styles for the "⋯" trigger button. */
  className?: string
  side?: 'right' | 'bottom' | 'top'
  align?: 'start' | 'end'
}

/**
 * "⋯" menu to play or shuffle a playlist without opening it. Safe to place
 * inside a link: clicks on the trigger or the menu don't reach the link.
 */
export function PlaylistPlayMenu({ playlist, className, side = 'bottom', align = 'end' }: PlaylistPlayMenuProps) {
  const client = useSubsonic()
  const queryClient = useQueryClient()
  const empty = playlist.songCount === 0

  const play = async (shuffle: boolean) => {
    const full = await queryClient.fetchQuery(playlistQuery(client, playlist.id))
    const tracks = (full.entry ?? []).map(toTrack)
    if (tracks.length) player.playQueue(tracks, shuffle ? Math.floor(Math.random() * tracks.length) : 0, { shuffle })
  }

  // React events bubble through portals, so the menu's clicks would otherwise reach an enclosing <Link>.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${playlist.name} options`}
        onClick={(e) => {
          e.preventDefault() // don't follow an enclosing link
          e.stopPropagation()
        }}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <MdMoreHoriz className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} onClick={stop} onPointerDown={stop}>
        <DropdownMenuItem onSelect={() => play(false)} disabled={empty}>
          <MdPlayArrow /> Play
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => play(true)} disabled={empty}>
          <MdShuffle /> Shuffle
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { MdAlbum, MdMoreVert, MdPerson, MdPlaylistAdd, MdPlaylistPlay } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { player } from '@/player/engine'
import type { Track } from '@/player/queue'

interface TrackMenuProps {
  /** Returns the tracks to act on; may fetch (e.g. an album's songs). */
  getTracks: () => Track[] | Promise<Track[]>
  /** For single songs: links to its album / artist. */
  albumId?: string
  artistId?: string
  trigger?: ReactNode
  className?: string
}

/** The "⋮" menu with queue actions, like the Android song item menu. */
export function TrackMenu({ getTracks, albumId, artistId, trigger, className }: TrackMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label="More options" className={className} onClick={(e) => e.stopPropagation()}>
            <MdMoreVert className="size-5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={async () => player.playNext(await getTracks())}>
          <MdPlaylistPlay /> Play next
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => player.addToQueue(await getTracks())}>
          <MdPlaylistAdd /> Add to queue
        </DropdownMenuItem>
        {(albumId || artistId) && <DropdownMenuSeparator />}
        {albumId && (
          <DropdownMenuItem asChild>
            <Link to="/album/$id" params={{ id: albumId }}>
              <MdAlbum /> Go to album
            </Link>
          </DropdownMenuItem>
        )}
        {artistId && (
          <DropdownMenuItem asChild>
            <Link to="/artist/$id" params={{ id: artistId }}>
              <MdPerson /> Go to artist
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

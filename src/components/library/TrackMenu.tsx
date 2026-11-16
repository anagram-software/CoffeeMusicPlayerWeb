import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import {
  MdAdd,
  MdAlbum,
  MdFavorite,
  MdFavoriteBorder,
  MdMoreVert,
  MdPerson,
  MdPlaylistAdd,
  MdPlaylistPlay,
  MdQueueMusic,
} from 'react-icons/md'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePlaylistMutations } from '@/lib/subsonic/playlists'
import { playlistsQuery } from '@/lib/subsonic/queries'
import { useIsStarred, useToggleStar } from '@/lib/subsonic/stars'
import { player } from '@/player/engine'
import type { Track } from '@/player/queue'
import { useSessionStore, useSubsonic } from '@/stores/session'
import { PlaylistNameDialog } from './PlaylistNameDialog'

interface TrackMenuProps {
  /** Returns the tracks to act on; may fetch (e.g. an album's songs). */
  getTracks: () => Track[] | Promise<Track[]>
  /** For single songs: favorite toggle and links to its album / artist. */
  song?: { id: string; starred: unknown }
  albumId?: string
  artistId?: string
  /** Extra items at the end (e.g. "Remove from playlist"). */
  extraItems?: ReactNode
  trigger?: ReactNode
  className?: string
}

/** The "⋮" menu with queue, favorite and playlist actions, like the Android song item menu. */
export function TrackMenu({ getTracks, song, albumId, artistId, extraItems, trigger, className }: TrackMenuProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const { create } = usePlaylistMutations()

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
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
            <MdQueueMusic /> Add to queue
          </DropdownMenuItem>
          {/* Only mounted while the menu is open, so closed menus don't fetch playlists. */}
          {open && <AddToPlaylistSub getTracks={getTracks} onNew={() => setCreateOpen(true)} />}
          {song && <StarItem id={song.id} starred={song.starred} />}
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
          {extraItems && (
            <>
              <DropdownMenuSeparator />
              {extraItems}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PlaylistNameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New playlist"
        submitLabel="Create"
        onSubmit={async (name) => create.mutate({ name, songIds: (await getTracks()).map((t) => t.id) })}
      />
    </>
  )
}

function StarItem({ id, starred }: { id: string; starred: unknown }) {
  const isStarred = useIsStarred(id, starred)
  const toggle = useToggleStar()
  return (
    <DropdownMenuItem onSelect={() => toggle('song', id, !isStarred)}>
      {isStarred ? <MdFavorite className="text-[#ff4081]" /> : <MdFavoriteBorder />}
      {isStarred ? 'Remove from favorites' : 'Add to favorites'}
    </DropdownMenuItem>
  )
}

function AddToPlaylistSub({ getTracks, onNew }: { getTracks: TrackMenuProps['getTracks']; onNew: () => void }) {
  const client = useSubsonic()
  const username = useSessionStore((s) => s.session?.user.name)
  const { data: playlists } = useQuery(playlistsQuery(client))
  const { addSongs } = usePlaylistMutations()
  const editable = (playlists ?? []).filter((p) => !p.readonly && p.owner === username)

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <MdPlaylistAdd /> Add to playlist
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
        <DropdownMenuItem onSelect={onNew}>
          <MdAdd /> New playlist…
        </DropdownMenuItem>
        {editable.length > 0 && <DropdownMenuSeparator />}
        {editable.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={async () => addSongs.mutate({ playlistId: p.id, name: p.name, songIds: (await getTracks()).map((t) => t.id) })}
          >
            {p.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

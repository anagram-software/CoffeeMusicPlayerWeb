import { Link } from '@tanstack/react-router'
import type { Child } from 'subsonic-api'
import { CoverArt } from '@/components/CoverArt'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

export const SONG_ROW_HEIGHT = 64

interface SongRowProps {
  song: Child
  /** "art" shows the cover (song lists); "track" shows the track number (album pages). */
  lead?: 'art' | 'track' | 'index'
  index?: number
  /** Hide the album name in the subtitle (e.g. on the album page itself). */
  hideAlbum?: boolean
  onPlay?: () => void
}

/** A song row, modelled on the Android song.xml / albumsongitem.xml. */
export function SongRow({ song, lead = 'art', index, hideAlbum, onPlay }: SongRowProps) {
  const artist = song.displayArtist ?? song.artist
  return (
    <div
      className={cn(
        'group flex h-16 items-center gap-4 rounded-md px-2 transition-colors hover:bg-white/5',
        onPlay && 'cursor-pointer',
      )}
      onDoubleClick={onPlay}
    >
      {lead === 'art' ? (
        <CoverArt id={song.coverArt} size={96} className="size-12 shrink-0 rounded" />
      ) : (
        <div className="w-8 shrink-0 text-center text-sm text-muted-foreground tabular-nums">
          {lead === 'track' ? (song.track ?? '–') : (index ?? 0) + 1}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{song.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {song.artistId ? (
            <Link to="/artist/$id" params={{ id: song.artistId }} className="hover:text-foreground hover:underline">
              {artist}
            </Link>
          ) : (
            artist
          )}
          {!hideAlbum && song.album && (
            <>
              {' • '}
              {song.albumId ? (
                <Link to="/album/$id" params={{ id: song.albumId }} className="hover:text-foreground hover:underline">
                  {song.album}
                </Link>
              ) : (
                song.album
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatDuration(song.duration)}</div>
    </div>
  )
}

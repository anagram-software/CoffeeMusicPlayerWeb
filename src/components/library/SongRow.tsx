import { Link } from '@tanstack/react-router'
import type { Child } from 'subsonic-api'
import { CoverArt } from '@/components/CoverArt'
import { PlayingBars } from '@/components/PlayingBars'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toTrack } from '@/player/queue'
import { usePlayerStore } from '@/player/store'
import { TrackMenu } from './TrackMenu'

export const SONG_ROW_HEIGHT = 64

interface SongRowProps {
  song: Child
  /** "art" shows the cover (song lists); "track" the track number (album pages); "index" the position. */
  lead?: 'art' | 'track' | 'index'
  index?: number
  /** Hide the album name in the subtitle (e.g. on the album page itself). */
  hideAlbum?: boolean
  onPlay?: () => void
}

/** A song row, modelled on the Android song.xml / albumsongitem.xml. Click to play. */
export function SongRow({ song, lead = 'art', index, hideAlbum, onPlay }: SongRowProps) {
  const artist = song.displayArtist ?? song.artist
  const isCurrent = usePlayerStore((s) => s.queue[s.index]?.track.id === song.id)
  const isPlaying = usePlayerStore((s) => s.playing)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onPlay?.()
        }
      }}
      className="group flex h-16 cursor-pointer items-center gap-4 rounded-md px-2 transition-colors outline-none hover:bg-white/5 focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {lead === 'art' ? (
        <div className="relative size-12 shrink-0">
          <CoverArt id={song.coverArt} size={96} className="size-full rounded" />
          {isCurrent && (
            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
              <PlayingBars playing={isPlaying} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex w-8 shrink-0 justify-center text-sm text-muted-foreground tabular-nums">
          {isCurrent ? <PlayingBars playing={isPlaying} /> : lead === 'track' ? (song.track ?? '–') : (index ?? 0) + 1}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-sm', isCurrent && 'text-section')}>{song.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {song.artistId ? (
            <Link
              to="/artist/$id"
              params={{ id: song.artistId }}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-foreground hover:underline"
            >
              {artist}
            </Link>
          ) : (
            artist
          )}
          {!hideAlbum && song.album && (
            <>
              {' • '}
              {song.albumId ? (
                <Link
                  to="/album/$id"
                  params={{ id: song.albumId }}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-foreground hover:underline"
                >
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
      <TrackMenu
        getTracks={() => [toTrack(song)]}
        albumId={hideAlbum ? undefined : song.albumId}
        artistId={song.artistId}
        className="-mr-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
      />
    </div>
  )
}

import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { MdPlayArrow } from 'react-icons/md'
import type { AlbumID3, ArtistID3 } from 'subsonic-api'
import { CoverArt } from '@/components/CoverArt'
import { PlaylistPlayMenu } from './PlaylistPlayMenu'
import { ProviderBadge } from './ProviderBadge'
import { plural } from '@/lib/format'
import { albumQuery, type PlaylistInfo } from '@/lib/subsonic/queries'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { useSubsonic } from '@/stores/session'

/**
 * Square art card with the title on a gradient overlay, like the Android
 * griditem.xml. Used for both albums and artists.
 */
export function GridCard({
  coverArt,
  title,
  subtitle,
  fallback,
  action,
  badgeId,
}: {
  coverArt?: string
  title: string
  subtitle?: string
  fallback?: 'music' | 'person'
  action?: ReactNode
  /** Item id: Octo-Fiesta items get a provider badge. */
  badgeId?: string
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-md shadow-md shadow-black/30">
      <CoverArt
        id={coverArt}
        size={400}
        alt=""
        fallback={fallback}
        className="size-full transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-linear-to-t from-black/85 via-black/45 to-transparent px-3 pt-10 pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{title}</div>
          {subtitle && <div className="truncate text-xs text-white/70">{subtitle}</div>}
        </div>
        {action}
      </div>
      <ProviderBadge id={badgeId} className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-white/5 ring-inset" />
    </div>
  )
}

export function AlbumCard({ album }: { album: AlbumID3 }) {
  const client = useSubsonic()
  const queryClient = useQueryClient()

  // Like the Android griditem's play button: play the album without opening it.
  const play = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const full = await queryClient.fetchQuery(albumQuery(client, album.id))
    player.playQueue((full.song ?? []).map(toTrack), 0, { shuffle: false })
  }

  return (
    <Link to="/album/$id" params={{ id: album.id }} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" title={album.name}>
      <GridCard
        coverArt={album.coverArt}
        title={album.name}
        subtitle={album.displayArtist ?? album.artist}
        badgeId={album.id}
        action={
          <span
            role="button"
            tabIndex={-1}
            onClick={play}
            aria-label={`Play ${album.name}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:scale-105 max-md:hidden"
          >
            <MdPlayArrow className="size-6" />
          </span>
        }
      />
    </Link>
  )
}

export function ArtistCard({ artist }: { artist: ArtistID3 }) {
  return (
    <Link to="/artist/$id" params={{ id: artist.id }} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" title={artist.name}>
      <GridCard
        coverArt={artist.coverArt}
        title={artist.name}
        badgeId={artist.id}
        subtitle={artist.albumCount ? `${artist.albumCount} album${artist.albumCount === 1 ? '' : 's'}` : undefined}
        fallback="person"
      />
    </Link>
  )
}

export function PlaylistCard({ playlist, showOwner }: { playlist: PlaylistInfo; showOwner?: boolean }) {
  return (
    <Link to="/playlist/$id" params={{ id: playlist.id }} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" title={playlist.name}>
      <GridCard
        coverArt={playlist.coverArt}
        title={playlist.name}
        subtitle={[plural(playlist.songCount, 'song'), showOwner && playlist.owner ? `by ${playlist.owner}` : null].filter(Boolean).join(' · ')}
        action={
          <PlaylistPlayMenu
            playlist={playlist}
            className="size-9 bg-white text-black opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:scale-105 data-[state=open]:opacity-100 max-md:opacity-100"
          />
        }
      />
    </Link>
  )
}

import { Link } from '@tanstack/react-router'
import type { AlbumID3, ArtistID3 } from 'subsonic-api'
import { CoverArt } from '@/components/CoverArt'

/**
 * Square art card with the title on a gradient overlay, like the Android
 * griditem.xml. Used for both albums and artists.
 */
function GridCard({ coverArt, title, subtitle, fallback }: { coverArt?: string; title: string; subtitle?: string; fallback?: 'music' | 'person' }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-md shadow-md shadow-black/30">
      <CoverArt
        id={coverArt}
        size={400}
        alt=""
        fallback={fallback}
        className="size-full transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/45 to-transparent px-3 pt-10 pb-2.5">
        <div className="truncate text-sm font-medium text-white">{title}</div>
        {subtitle && <div className="truncate text-xs text-white/70">{subtitle}</div>}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-white/5 ring-inset" />
    </div>
  )
}

export function AlbumCard({ album }: { album: AlbumID3 }) {
  return (
    <Link to="/album/$id" params={{ id: album.id }} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" title={album.name}>
      <GridCard coverArt={album.coverArt} title={album.name} subtitle={album.displayArtist ?? album.artist} />
    </Link>
  )
}

export function ArtistCard({ artist }: { artist: ArtistID3 }) {
  return (
    <Link to="/artist/$id" params={{ id: artist.id }} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" title={artist.name}>
      <GridCard
        coverArt={artist.coverArt}
        title={artist.name}
        subtitle={artist.albumCount ? `${artist.albumCount} album${artist.albumCount === 1 ? '' : 's'}` : undefined}
        fallback="person"
      />
    </Link>
  )
}

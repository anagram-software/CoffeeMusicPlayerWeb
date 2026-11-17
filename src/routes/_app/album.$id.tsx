import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { Child } from 'subsonic-api'
import { DetailHeader } from '@/components/library/DetailHeader'
import { SongRow } from '@/components/library/SongRow'
import { ErrorState, ListSkeleton } from '@/components/library/states'
import { formatTotalDuration, plural } from '@/lib/format'
import { albumQuery } from '@/lib/subsonic/queries'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { getClient, useSubsonic } from '@/stores/session'
import { PlayActions } from '@/components/library/PlayActions'

export const Route = createFileRoute('/_app/album/$id')({
  staticData: { section: 'library' },
  loader: ({ context, params }) => context.queryClient.prefetchQuery(albumQuery(getClient(), params.id)),
  component: AlbumPage,
})

function AlbumPage() {
  const { id } = Route.useParams()
  const query = useQuery(albumQuery(useSubsonic(), id))

  if (query.isPending) return <ListSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const album = query.data
  const songs = album.song ?? []
  const discs = groupByDisc(songs)
  const albumArtist = album.displayArtist ?? album.artist
  // Play in displayed (disc, track) order.
  const ordered = discs.flatMap(([, songs]) => songs)
  const tracks = ordered.map(toTrack)

  return (
    <div className="pb-10">
      <DetailHeader
        kind="Album"
        coverArt={album.coverArt}
        title={album.name}
        subtitle={
          album.artistId ? (
            <Link to="/artist/$id" params={{ id: album.artistId }} className="hover:underline">
              {albumArtist}
            </Link>
          ) : (
            albumArtist
          )
        }
        tags={[album.year ? String(album.year) : undefined, album.genre, plural(album.songCount, 'song'), formatTotalDuration(album.duration)]}
      >
        <PlayActions tracks={tracks} star={{ kind: 'album', id: album.id, starred: album.starred }} />
      </DetailHeader>

      <div className="px-2 md:px-4">
        {discs.map(([disc, discSongs]) => (
          <section key={disc}>
            {discs.length > 1 && (
              <h2 className="px-4 pt-4 pb-1 text-xs font-medium tracking-wider text-section-ink uppercase">
                Disc {disc}
                {album.discTitles?.find((d) => d.disc === disc)?.title ? ` · ${album.discTitles.find((d) => d.disc === disc)!.title}` : ''}
              </h2>
            )}
            {discSongs.map((s) => (
              <SongRow key={s.id} song={s} lead="track" hideAlbum onPlay={() => player.playQueue(tracks, ordered.indexOf(s))} />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function groupByDisc(songs: Child[]): [number, Child[]][] {
  const map = new Map<number, Child[]>()
  for (const s of songs) {
    const disc = s.discNumber ?? 1
    map.set(disc, [...(map.get(disc) ?? []), s])
  }
  return [...map.entries()].sort(([a], [b]) => a - b)
}

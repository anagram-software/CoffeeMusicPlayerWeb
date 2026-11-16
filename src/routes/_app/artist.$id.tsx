import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AlbumCard, ArtistCard } from '@/components/library/AlbumCard'
import { DetailHeader } from '@/components/library/DetailHeader'
import { SongRow } from '@/components/library/SongRow'
import { ErrorState, ListSkeleton, SectionTitle } from '@/components/library/states'
import { plural, stripHtml } from '@/lib/format'
import { artistInfoQuery, artistQuery, topSongsQuery } from '@/lib/subsonic/queries'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { getClient, useSubsonic } from '@/stores/session'
import { PlayActions } from '@/components/library/PlayActions'

export const Route = createFileRoute('/_app/artist/$id')({
  staticData: { section: 'library' },
  loader: ({ context, params }) => context.queryClient.prefetchQuery(artistQuery(getClient(), params.id)),
  component: ArtistPage,
})

const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4'

function ArtistPage() {
  const { id } = Route.useParams()
  const client = useSubsonic()
  const query = useQuery(artistQuery(client, id))
  const info = useQuery(artistInfoQuery(client, id))
  const top = useQuery({ ...topSongsQuery(client, id, query.data?.name ?? ''), enabled: !!query.data })

  if (query.isPending) return <ListSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const artist = query.data
  const albums = [...(artist.album ?? [])].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  const songCount = albums.reduce((n, a) => n + a.songCount, 0)
  const similar = info.data?.similarArtist ?? []

  return (
    <div className="pb-10">
      <DetailHeader
        kind="Artist"
        coverArt={artist.coverArt}
        fallback="person"
        title={artist.name}
        tags={[plural(albums.length, 'album'), plural(songCount, 'song')]}
      >
        {/* Plays the top songs (Navidrome has them only when Last.fm is configured). */}
        <PlayActions tracks={top.data?.map(toTrack) ?? []} star={{ kind: 'artist', id: artist.id, starred: artist.starred }} />
      </DetailHeader>

      <div className="flex flex-col gap-10 px-4 md:px-6">
        {info.data?.biography && <Biography html={info.data.biography} lastFmUrl={info.data.lastFmUrl} />}

        {top.data && top.data.length > 0 && (
          <section>
            <SectionTitle>Top songs</SectionTitle>
            <div className="-mx-2">
              {top.data.map((s, i) => (
                <SongRow key={s.id} song={s} lead="index" index={i} onPlay={() => player.playQueue(top.data.map(toTrack), i)} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Albums</SectionTitle>
          <div className={gridClass}>
            {albums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </section>

        {similar.length > 0 && (
          <section>
            <SectionTitle>Similar artists</SectionTitle>
            <div className={gridClass}>
              {similar.map((a) => (
                <ArtistCard key={a.id} artist={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Biography({ html, lastFmUrl }: { html: string; lastFmUrl?: string }) {
  const [expanded, setExpanded] = useState(false)
  // Drop Last.fm's trailing "Read more on Last.fm" anchor; we link it ourselves.
  const text = stripHtml(html.replace(/<a\b[^>]*>.*?<\/a>\.?/gi, ''))
  if (!text) return null

  return (
    <section className="max-w-3xl">
      <SectionTitle>About</SectionTitle>
      <p className={`text-sm leading-relaxed whitespace-pre-line text-muted-foreground ${expanded ? '' : 'line-clamp-4'}`}>{text}</p>
      <div className="mt-2 flex gap-4 text-xs">
        <button type="button" className="font-medium text-section hover:underline" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
        {lastFmUrl && (
          <a href={lastFmUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline">
            Last.fm
          </a>
        )}
      </div>
    </section>
  )
}

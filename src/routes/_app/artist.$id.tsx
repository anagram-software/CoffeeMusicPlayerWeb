import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { AlbumID3 } from 'subsonic-api'
import { AlbumCard, ArtistCard } from '@/components/library/AlbumCard'
import { DetailHeader } from '@/components/library/DetailHeader'
import { SongRow } from '@/components/library/SongRow'
import { ErrorState, ListSkeleton, SectionTitle } from '@/components/library/states'
import { plural, stripHtml } from '@/lib/format'
import { isExternalId } from '@/lib/subsonic/external'
import { looksLikeCover, mergeEditions, releaseKind } from '@/lib/subsonic/relevance'
import { useSettingsStore } from '@/stores/settings'
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
  const hideCovers = useSettingsStore((s) => s.hideCovers)
  const [showAppearsOn, setShowAppearsOn] = useState(false)

  if (query.isPending) return <ListSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const artist = query.data
  const albums = [...(artist.album ?? [])].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  const songCount = albums.reduce((n, a) => n + a.songCount, 0)
  const releases = groupReleases(albums, artist.name, isExternalId(artist.id) && hideCovers)
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

        {releases.albums.length > 0 && <ReleaseSection title="Albums" albums={releases.albums} />}
        {releases.singles.length > 0 && <ReleaseSection title="Singles & EPs" albums={releases.singles} />}
        {releases.appearsOn.length > 0 && (
          <section>
            <SectionTitle
              action={
                <button type="button" onClick={() => setShowAppearsOn((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
                  {showAppearsOn ? 'Hide' : `Show ${releases.appearsOn.length}`}
                </button>
              }
            >
              Appears on
            </SectionTitle>
            {showAppearsOn && (
              <div className={gridClass}>
                {releases.appearsOn.map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
              </div>
            )}
          </section>
        )}
        {releases.hidden > 0 && (
          <p className="-mt-6 text-xs text-muted-foreground">
            {plural(releases.hidden, 'cover or karaoke release')} hidden (Search → “Hide covers & karaoke”).
          </p>
        )}

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

function ReleaseSection({ title, albums }: { title: string; albums: AlbumID3[] }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className={gridClass}>
        {albums.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      </div>
    </section>
  )
}

/**
 * Albums / Singles & EPs / Appears on. For streaming-provider artists, also
 * drops cover/karaoke filler and merges duplicate editions (Deluxe,
 * Remastered…). If nothing is credited to the artist directly, everything is
 * shown as albums rather than hidden under "Appears on".
 */
function groupReleases(albums: AlbumID3[], artistName: string, filterExternal: boolean) {
  let list = albums
  let hidden = 0
  if (filterExternal) {
    const kept = list.filter((a) => !looksLikeCover(a.name, a.artist))
    hidden = list.length - kept.length
    list = mergeEditions(kept)
  }
  const groups = { albums: [] as AlbumID3[], singles: [] as AlbumID3[], appearsOn: [] as AlbumID3[], hidden }
  for (const a of list) {
    const kind = releaseKind(a, artistName)
    groups[kind === 'album' ? 'albums' : kind === 'single' ? 'singles' : 'appearsOn'].push(a)
  }
  if (groups.albums.length === 0 && groups.singles.length === 0) {
    groups.albums = groups.appearsOn
    groups.appearsOn = []
  }
  return groups
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
        <button type="button" className="font-medium text-section-ink hover:underline" onClick={() => setExpanded((e) => !e)}>
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

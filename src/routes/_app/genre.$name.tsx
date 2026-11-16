import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlbumCard } from '@/components/library/AlbumCard'
import { DetailHeader } from '@/components/library/DetailHeader'
import { SONG_ROW_HEIGHT, SongRow } from '@/components/library/SongRow'
import { ErrorState, GridSkeleton, ListSkeleton, SectionTitle } from '@/components/library/states'
import { VirtualList } from '@/components/library/VirtualList'
import { plural } from '@/lib/format'
import { genreAlbumsQuery, genreListQuery, genreSongsQuery } from '@/lib/subsonic/queries'
import { getClient, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/genre/$name')({
  staticData: { section: 'library' },
  loader: ({ context, params }) => context.queryClient.prefetchQuery(genreAlbumsQuery(getClient(), params.name)),
  component: GenrePage,
})

function GenrePage() {
  const { name } = Route.useParams()
  const client = useSubsonic()
  const albums = useQuery(genreAlbumsQuery(client, name))
  const songs = useInfiniteQuery(genreSongsQuery(client, name))
  const genre = useQuery({ ...genreListQuery(client), select: (gs) => gs.find((g) => g.value === name) })

  return (
    <div className="pb-10">
      <DetailHeader
        kind="Genre"
        coverArt={albums.data?.[0]?.coverArt}
        title={name}
        tags={genre.data ? [plural(genre.data.albumCount, 'album'), plural(genre.data.songCount, 'song')] : []}
      />

      <div className="flex flex-col gap-10 px-4 md:px-6">
        <section>
          <SectionTitle>Albums</SectionTitle>
          {albums.isPending ? (
            <GridSkeleton count={6} />
          ) : albums.isError ? (
            <ErrorState error={albums.error} onRetry={() => albums.refetch()} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {albums.data.map((a) => (
                <AlbumCard key={a.id} album={a} />
              ))}
            </div>
          )}
        </section>

        <section className="-mx-2">
          <div className="px-2">
            <SectionTitle>Songs</SectionTitle>
          </div>
          {songs.isPending ? (
            <ListSkeleton count={5} />
          ) : songs.isError ? (
            <ErrorState error={songs.error} onRetry={() => songs.refetch()} />
          ) : (
            <VirtualList
              items={songs.data}
              getKey={(s) => s.id}
              rowHeight={SONG_ROW_HEIGHT}
              renderItem={(s) => <SongRow song={s} />}
              hasMore={songs.hasNextPage && !songs.isFetchingNextPage}
              onLoadMore={songs.fetchNextPage}
            />
          )}
        </section>
      </div>
    </div>
  )
}

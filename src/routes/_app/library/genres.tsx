import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MdCategory } from 'react-icons/md'
import type { Genre } from 'subsonic-api'
import { CoverArt } from '@/components/CoverArt'
import { EmptyState, ErrorState } from '@/components/library/states'
import { VirtualList } from '@/components/library/VirtualList'
import { Skeleton } from '@/components/ui/skeleton'
import { plural } from '@/lib/format'
import { genreAlbumsQuery, genreListQuery } from '@/lib/subsonic/queries'
import { getClient, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/library/genres')({
  loader: ({ context }) => context.queryClient.prefetchQuery(genreListQuery(getClient())),
  component: GenresTab,
})

const ROW_HEIGHT = 104

function GenresTab() {
  const query = useQuery(genreListQuery(useSubsonic()))

  return (
    <div className="px-4 py-4 md:px-6">
      {query.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={MdCategory} message="No genres found" />
      ) : (
        <VirtualList items={query.data} getKey={(g) => g.value} rowHeight={ROW_HEIGHT} renderItem={(g) => <GenreRow genre={g} />} />
      )}
    </div>
  )
}

/**
 * Like the Android genre.xml: a strip of album covers behind the name.
 * The covers are fetched lazily, only for rows that are on screen.
 */
function GenreRow({ genre }: { genre: Genre }) {
  const client = useSubsonic()
  const { data: albums } = useQuery({ ...genreAlbumsQuery(client, genre.value, 5), staleTime: 60 * 60 * 1000 })

  return (
    <Link
      to="/genre/$name"
      params={{ name: genre.value }}
      className="group relative isolate flex h-24 items-end overflow-hidden rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="absolute inset-0 -z-10 flex bg-art">
        {albums?.map((a) => (
          <CoverArt key={a.id} id={a.coverArt} size={200} className="h-full flex-1 opacity-80 transition-opacity group-hover:opacity-100" />
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/85 via-black/55 to-black/10" />
      <div className="px-4 pb-3">
        <div className="text-2xl font-light text-white">{genre.value}</div>
        <div className="text-xs text-white/70">
          {plural(genre.albumCount, 'album')} • {plural(genre.songCount, 'song')}
        </div>
      </div>
    </Link>
  )
}

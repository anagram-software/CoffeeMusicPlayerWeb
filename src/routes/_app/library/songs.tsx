import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MdMusicNote } from 'react-icons/md'
import { SONG_ROW_HEIGHT, SongRow } from '@/components/library/SongRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/library/states'
import { VirtualList } from '@/components/library/VirtualList'
import { songListQuery } from '@/lib/subsonic/queries'
import { getClient, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/library/songs')({
  loader: ({ context }) => context.queryClient.prefetchInfiniteQuery(songListQuery(getClient())),
  component: SongsTab,
})

function SongsTab() {
  const query = useInfiniteQuery(songListQuery(useSubsonic()))

  return (
    <div className="px-2 py-4 md:px-4">
      <div className="mb-2 px-2 text-sm text-muted-foreground">
        {query.data ? `${query.data.length.toLocaleString()}${query.hasNextPage ? '+' : ''} songs` : ' '}
      </div>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={MdMusicNote} message="No songs yet" />
      ) : (
        <VirtualList
          items={query.data}
          getKey={(s) => s.id}
          rowHeight={SONG_ROW_HEIGHT}
          renderItem={(s) => <SongRow song={s} />}
          hasMore={query.hasNextPage && !query.isFetchingNextPage}
          onLoadMore={query.fetchNextPage}
        />
      )}
    </div>
  )
}

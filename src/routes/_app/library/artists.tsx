import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MdPerson } from 'react-icons/md'
import { ArtistCard } from '@/components/library/AlbumCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/library/states'
import { VirtualGrid } from '@/components/library/VirtualGrid'
import { artistListQuery } from '@/lib/subsonic/queries'
import { getClient, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/library/artists')({
  loader: ({ context }) => context.queryClient.prefetchQuery(artistListQuery(getClient())),
  component: ArtistsTab,
})

function ArtistsTab() {
  const query = useQuery(artistListQuery(useSubsonic()))

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mb-4 text-sm text-muted-foreground">{query.data ? `${query.data.length.toLocaleString()} artists` : ' '}</div>
      {query.isPending ? (
        <GridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={MdPerson} message="No artists yet" />
      ) : (
        <VirtualGrid items={query.data} getKey={(a) => a.id} renderItem={(a) => <ArtistCard artist={a} />} />
      )}
    </div>
  )
}

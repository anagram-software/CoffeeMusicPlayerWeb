import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MdAlbum, MdSort } from 'react-icons/md'
import { z } from 'zod'
import { AlbumCard } from '@/components/library/AlbumCard'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/library/states'
import { VirtualGrid } from '@/components/library/VirtualGrid'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type AlbumSort, albumListQuery, albumSorts } from '@/lib/subsonic/queries'
import { getClient, useSubsonic } from '@/stores/session'

const sortKeys = Object.keys(albumSorts) as [AlbumSort, ...AlbumSort[]]

export const Route = createFileRoute('/_app/library/albums')({
  validateSearch: z.object({ sort: z.enum(sortKeys).optional() }),
  loaderDeps: ({ search }) => ({ sort: search.sort ?? 'alphabeticalByName' }),
  // Start fetching during navigation (and on link hover) rather than after render.
  loader: ({ context, deps }) => context.queryClient.prefetchInfiniteQuery(albumListQuery(getClient(), deps.sort)),
  component: AlbumsTab,
})

function AlbumsTab() {
  const sort = Route.useSearch({ select: (s) => s.sort ?? 'alphabeticalByName' })
  const navigate = useNavigate({ from: Route.fullPath })
  const query = useInfiniteQuery(albumListQuery(useSubsonic(), sort))

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{query.data ? `${query.data.length.toLocaleString()}${query.hasNextPage ? '+' : ''} albums` : ' '}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <MdSort className="size-4" /> {albumSorts[sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(v) => navigate({ search: { sort: v === 'alphabeticalByName' ? undefined : (v as AlbumSort) } })}
            >
              {sortKeys.map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {albumSorts[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {query.isPending ? (
        <GridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={MdAlbum} message="No albums yet" />
      ) : (
        <VirtualGrid
          items={query.data}
          getKey={(a) => a.id}
          renderItem={(a) => <AlbumCard album={a} />}
          hasMore={query.hasNextPage && !query.isFetchingNextPage}
          onLoadMore={query.fetchNextPage}
        />
      )}
    </div>
  )
}

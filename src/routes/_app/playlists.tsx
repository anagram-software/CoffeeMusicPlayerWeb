import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { MdAdd, MdQueueMusic } from 'react-icons/md'
import { PlaylistCard } from '@/components/library/AlbumCard'
import { PlaylistNameDialog } from '@/components/library/PlaylistNameDialog'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/library/states'
import { VirtualGrid } from '@/components/library/VirtualGrid'
import { Button } from '@/components/ui/button'
import { usePlaylistMutations } from '@/lib/subsonic/playlists'
import { playlistsQuery } from '@/lib/subsonic/queries'
import { getClient, useSessionStore, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/playlists')({
  staticData: { section: 'playlists' },
  loader: ({ context }) => context.queryClient.prefetchQuery(playlistsQuery(getClient())),
  component: PlaylistsPage,
})

function PlaylistsPage() {
  const query = useQuery(playlistsQuery(useSubsonic()))
  const username = useSessionStore((s) => s.session?.user.name)
  const [createOpen, setCreateOpen] = useState(false)
  const { create } = usePlaylistMutations()
  const navigate = useNavigate()

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{query.data ? `${query.data.length} playlists` : ' '}</span>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <MdAdd className="size-4" /> New playlist
        </Button>
      </div>

      {query.isPending ? (
        <GridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={MdQueueMusic} message="No playlists yet" />
      ) : (
        <VirtualGrid
          items={query.data}
          getKey={(p) => p.id}
          renderItem={(p) => <PlaylistCard playlist={p} showOwner={p.owner !== username} />}
        />
      )}

      <PlaylistNameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New playlist"
        submitLabel="Create"
        onSubmit={async (name) => {
          const p = await create.mutateAsync({ name }).catch(() => null) // failure toast comes from the mutation
          if (p) navigate({ to: '/playlist/$id', params: { id: p.id } })
        }}
      />
    </div>
  )
}

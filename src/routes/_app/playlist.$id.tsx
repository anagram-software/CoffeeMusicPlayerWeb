import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { MdDelete, MdDragHandle, MdEdit, MdLock, MdPublic, MdQueueMusic, MdRemoveCircleOutline, MdSettings } from 'react-icons/md'
import type { Child } from 'subsonic-api'
import { DetailHeader } from '@/components/library/DetailHeader'
import { PlayActions } from '@/components/library/PlayActions'
import { PlaylistNameDialog } from '@/components/library/PlaylistNameDialog'
import { SongRow } from '@/components/library/SongRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/library/states'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatTotalDuration, plural } from '@/lib/format'
import { usePlaylistMutations } from '@/lib/subsonic/playlists'
import { playlistQuery } from '@/lib/subsonic/queries'
import { cn } from '@/lib/utils'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { getClient, useSessionStore, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/playlist/$id')({
  staticData: { section: 'playlists' },
  loader: ({ context, params }) => context.queryClient.prefetchQuery(playlistQuery(getClient(), params.id)),
  component: PlaylistPage,
})

function PlaylistPage() {
  const { id } = Route.useParams()
  const query = useQuery(playlistQuery(useSubsonic(), id))
  const username = useSessionStore((s) => s.session?.user.name)
  const mutations = usePlaylistMutations()
  const navigate = useNavigate()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (query.isPending) return <ListSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const playlist = query.data
  const songs = playlist.entry ?? []
  const tracks = songs.map(toTrack)
  const editable = !playlist.readonly && playlist.owner === username
  const play = (i: number) => player.playQueue(tracks, i)
  const removeAt = (index: number) => mutations.removeSongs.mutate({ playlistId: id, indexes: [index] })

  return (
    <div className="pb-10">
      <DetailHeader
        kind={playlist.readonly ? 'Smart playlist' : 'Playlist'}
        coverArt={playlist.coverArt}
        title={playlist.name}
        subtitle={playlist.owner && playlist.owner !== username ? `by ${playlist.owner}` : undefined}
        tags={[plural(playlist.songCount, 'song'), playlist.duration > 0 && formatTotalDuration(playlist.duration), playlist.public ? 'Public' : 'Private']}
      >
        {playlist.comment && <p className="max-w-xl text-sm text-muted-foreground">{playlist.comment}</p>}
        <PlayActions tracks={tracks}>
          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Edit playlist" className="text-foreground">
                  <MdSettings className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                  <MdEdit /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => mutations.update.mutate({ playlistId: id, public: !playlist.public })}>
                  {playlist.public ? <MdLock /> : <MdPublic />} Make {playlist.public ? 'private' : 'public'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                  <MdDelete /> Delete playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </PlayActions>
      </DetailHeader>

      <div className="px-2 md:px-4">
        {songs.length === 0 ? (
          <EmptyState icon={MdQueueMusic} message="This playlist is empty. Add songs from their ⋮ menu." />
        ) : editable ? (
          <SortableSongs
            songs={songs}
            onReorder={(next) => mutations.reorder.mutate({ playlistId: id, songs: next })}
            onPlay={play}
            onRemove={removeAt}
          />
        ) : (
          songs.map((s, i) => <SongRow key={`${s.id}-${i}`} song={s} lead="index" index={i} onPlay={() => play(i)} />)
        )}
      </div>

      <PlaylistNameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename playlist"
        submitLabel="Save"
        initialName={playlist.name}
        onSubmit={(name) => mutations.update.mutate({ playlistId: id, name })}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{playlist.name}”?</AlertDialogTitle>
            <AlertDialogDescription>The playlist is removed from the server. The songs stay in your library.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                // mutateAsync: per-call callbacks on mutate() can be skipped when the page re-renders mid-flight.
                // Failures are already shown as a toast by the mutation.
                const ok = await mutations.remove.mutateAsync({ id, name: playlist.name }).then(() => true, () => false)
                if (ok) navigate({ to: '/playlists', replace: true })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Songs with drag handles; a playlist can contain the same song twice, so keys include the position. */
function SortableSongs({
  songs,
  onReorder,
  onPlay,
  onRemove,
}: {
  songs: Child[]
  onReorder: (songs: Child[]) => void
  onPlay: (index: number) => void
  onRemove: (index: number) => void
}) {
  const keys = songs.map((s, i) => `${i}:${s.id}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = keys.indexOf(String(active.id))
    const to = keys.indexOf(String(over.id))
    const next = [...songs]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        {songs.map((s, i) => (
          <SortableSong key={keys[i]} id={keys[i]} song={s} index={i} onPlay={() => onPlay(i)} onRemove={() => onRemove(i)} />
        ))}
      </SortableContext>
    </DndContext>
  )
}

function SortableSong({ id, song, index, onPlay, onRemove }: { id: string; song: Child; index: number; onPlay: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('flex items-center', isDragging && 'relative z-10 rounded-md bg-card shadow-lg')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${song.title}`}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <MdDragHandle className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <SongRow
          song={song}
          lead="index"
          index={index}
          onPlay={onPlay}
          menuExtra={
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <MdRemoveCircleOutline /> Remove from playlist
            </DropdownMenuItem>
          }
        />
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MdArrowUpward, MdFolder, MdFolderOpen } from 'react-icons/md'
import type { Child } from 'subsonic-api'
import { z } from 'zod'
import { CoverArt } from '@/components/CoverArt'
import { SONG_ROW_HEIGHT, SongRow } from '@/components/library/SongRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/library/states'
import { VirtualList } from '@/components/library/VirtualList'
import { directoryQuery, indexesQuery } from '@/lib/subsonic/queries'
import { getClient, useSubsonic } from '@/stores/session'

/*
 * Folder browser over getIndexes / getMusicDirectory. Navidrome builds this
 * hierarchy from tags (artist → album → songs), not from the file system.
 */
export const Route = createFileRoute('/_app/library/folders')({
  validateSearch: z.object({ id: z.string().optional() }),
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: ({ context, deps }) =>
    deps.id
      ? context.queryClient.prefetchQuery(directoryQuery(getClient(), deps.id))
      : context.queryClient.prefetchQuery(indexesQuery(getClient())),
  component: FoldersTab,
})

type Entry = { kind: 'dir'; id: string; name: string; coverArt?: string } | { kind: 'file'; song: Child }

function FoldersTab() {
  const { id } = Route.useSearch()
  const client = useSubsonic()
  const root = useQuery({ ...indexesQuery(client), enabled: !id })
  const dir = useQuery({ ...directoryQuery(client, id ?? ''), enabled: !!id })
  const query = id ? dir : root

  let entries: Entry[] = []
  if (id && dir.data) {
    entries = (dir.data.child ?? []).map((c) =>
      c.isDir ? { kind: 'dir', id: c.id, name: c.title, coverArt: c.coverArt } : { kind: 'file', song: c },
    )
  } else if (!id && root.data) {
    entries = [
      ...root.data.dirs.map((d) => ({ kind: 'dir' as const, ...d })),
      ...root.data.files.map((song) => ({ kind: 'file' as const, song })),
    ]
  }

  return (
    <div className="px-2 py-4 md:px-4">
      {/* Path bar with an "up" button, like the Android folder browser */}
      <div className="mb-2 flex h-9 items-center gap-2 px-2">
        {id ? (
          <Link
            to="/library/folders"
            search={{ id: dir.data?.parent && dir.data.parent !== '' ? dir.data.parent : undefined }}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label="Up one folder"
          >
            <MdArrowUpward className="size-5" />
          </Link>
        ) : (
          <MdFolderOpen className="size-5 text-muted-foreground" />
        )}
        <span className="truncate text-sm text-muted-foreground">{id ? (dir.data?.name ?? '…') : 'Library'}</span>
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState icon={MdFolder} message="This folder is empty" />
      ) : (
        <VirtualList
          items={entries}
          getKey={(e) => (e.kind === 'dir' ? `d:${e.id}` : `f:${e.song.id}`)}
          rowHeight={SONG_ROW_HEIGHT}
          renderItem={(e) =>
            e.kind === 'dir' ? <FolderRow id={e.id} name={e.name} coverArt={e.coverArt} /> : <SongRow song={e.song} />
          }
        />
      )}
    </div>
  )
}

function FolderRow({ id, name, coverArt }: { id: string; name: string; coverArt?: string }) {
  return (
    <Link
      to="/library/folders"
      search={{ id }}
      className="flex h-16 items-center gap-4 rounded-md px-2 transition-colors hover:bg-white/5"
    >
      {coverArt ? (
        <CoverArt id={coverArt} size={96} className="size-12 shrink-0 rounded" />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center">
          <MdFolder className="size-9 text-white/80" />
        </div>
      )}
      <span className="truncate text-sm">{name}</span>
    </Link>
  )
}

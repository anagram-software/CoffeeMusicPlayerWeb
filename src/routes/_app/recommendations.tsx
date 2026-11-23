import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { MdAlbum, MdExplore, MdMusicNote, MdNewReleases, MdPerson, MdSettings } from 'react-icons/md'
import { z } from 'zod'
import { TabStrip } from '@/components/layout/TabStrip'
import { Chip } from '@/components/library/Chip'
import { EmptyState, ErrorState, GridSkeleton, ListSkeleton } from '@/components/library/states'
import { VirtualGrid } from '@/components/library/VirtualGrid'
import { VirtualList } from '@/components/library/VirtualList'
import { REC_CARD_CAPTION_HEIGHT, REC_CARD_REASON_HEIGHT, REC_ROW_HEIGHT, RecArtistRow, type RecHandlers, RecReleaseCard, RecSongRow } from '@/components/recs/RecItems'
import { Button } from '@/components/ui/button'
import { plural } from '@/lib/format'
import type { RecItem, RecsClient } from '@/lib/recs/client'
import { useRecFeedback } from '@/lib/recs/feedback'
import { reasonText } from '@/lib/recs/reason'
import { newReleasesQuery, recAlbumsQuery, recArtistsQuery, recSongsQuery, recsStatusQuery } from '@/lib/recs/queries'
import { useRecActions } from '@/lib/recs/useRecActions'
import { useRecs } from '@/lib/recs/useRecs'
import { openSettings } from '@/stores/ui'

export const Route = createFileRoute('/_app/recommendations')({
  staticData: { section: 'discover' },
  validateSearch: z.object({
    tab: z.enum(['albums', 'releases', 'songs']).optional(),
    /** Albums: missing albums by artists you have, instead of albums by new artists. */
    source: z.enum(['library']).optional(),
    /** New releases: from recommended artists, instead of your own. */
    scope: z.enum(['related']).optional(),
  }),
  component: DiscoverPage,
})

const tabLink = (tab: 'albums' | 'releases' | 'songs' | undefined) => ({
  to: '/recommendations' as const,
  search: { tab },
  activeOptions: { includeSearch: true, explicitUndefined: true },
})

function DiscoverPage() {
  const recs = useRecs()
  return (
    <div className="flex flex-col">
      <TabStrip
        tabs={[
          { label: 'Artists', link: tabLink(undefined) },
          { label: 'Albums', link: tabLink('albums') },
          { label: 'New releases', link: tabLink('releases') },
          { label: 'Songs', link: tabLink('songs') },
        ]}
      />
      <div className="px-4 pt-4 pb-10 md:px-6">{recs ? <DiscoverContent recs={recs} /> : <Setup />}</div>
    </div>
  )
}

function Setup() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
      <MdExplore className="size-12 opacity-50" />
      <p className="max-w-md text-sm">
        Discover shows artists, albums, new releases and songs picked from your library by Coffee Recs, a recommendation service built on MusicBrainz. Add its address and API key
        to start.
      </p>
      <Button variant="outline" onClick={() => openSettings('recommendations')}>
        <MdSettings /> Set up recommendations
      </Button>
    </div>
  )
}

function DiscoverContent({ recs }: { recs: RecsClient }) {
  const { tab, source, scope } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const feedback = useRecFeedback(recs)
  const actions = useRecActions()
  const handlers: RecHandlers = { busy: actions.busy, feedbackOf: feedback.actionOf, onLike: feedback.toggleLike, onDismiss: feedback.dismiss }

  if (tab === 'albums') {
    return (
      <>
        <Toolbar recs={recs}>
          <Chip active={!source} onClick={() => navigate({ search: (p) => ({ ...p, source: undefined }) })}>
            By new artists
          </Chip>
          <Chip active={source === 'library'} onClick={() => navigate({ search: (p) => ({ ...p, source: 'library' as const }) })}>
            Missing from your artists
          </Chip>
        </Toolbar>
        <ReleaseGrid
          query={recAlbumsQuery(recs, source ?? 'related')}
          handlers={handlers}
          onOpen={actions.openAlbum}
          onPlay={actions.playAlbum}
          empty={source ? 'Nothing missing: you have every album by your artists that MusicBrainz knows of.' : 'No album recommendations yet.'}
        />
      </>
    )
  }

  if (tab === 'releases') {
    return (
      <>
        <Toolbar recs={recs}>
          <Chip active={!scope} onClick={() => navigate({ search: (p) => ({ ...p, scope: undefined }) })}>
            Your artists
          </Chip>
          <Chip active={scope === 'related'} onClick={() => navigate({ search: (p) => ({ ...p, scope: 'related' as const }) })}>
            Recommended artists
          </Chip>
        </Toolbar>
        <ReleaseGrid
          query={newReleasesQuery(recs, scope ?? 'library')}
          handlers={handlers}
          onOpen={actions.openAlbum}
          onPlay={actions.playAlbum}
          showDate
          icon={MdNewReleases}
          empty="No new or upcoming releases from these artists lately."
        />
      </>
    )
  }

  if (tab === 'songs') {
    return (
      <>
        <Toolbar recs={recs} />
        <ItemList
          query={recSongsQuery(recs)}
          icon={MdMusicNote}
          empty="No song recommendations. They need a ListenBrainz token (LISTENBRAINZ_TOKEN) on the Coffee Recs service."
          render={(item) => <RecSongRow item={item} handlers={handlers} onPlay={actions.playSong} />}
        />
      </>
    )
  }

  return (
    <>
      <Toolbar recs={recs} />
      <ItemList
        query={recArtistsQuery(recs)}
        icon={MdPerson}
        empty="No artist recommendations yet. They appear after Coffee Recs finishes its first run."
        render={(item) => <RecArtistRow item={item} handlers={handlers} onOpen={actions.openArtist} />}
      />
    </>
  )
}

/** Filter chips, and when the lists were last computed. */
function Toolbar({ recs, children }: { recs: RecsClient; children?: ReactNode }) {
  const { data: status } = useQuery(recsStatusQuery(recs))
  const finished = status?.last_run?.finished_at
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {children}
      <span className="ml-auto text-xs text-muted-foreground">
        {status?.running ? 'Updating now…' : finished ? `Updated ${formatWhen(finished)}` : ''}
      </span>
    </div>
  )
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (days < 1 && date.getDate() === new Date().getDate()) return `today at ${time}`
  if (days < 2) return `yesterday at ${time}`
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

type ListQuery = ReturnType<typeof recArtistsQuery>

function ItemList({ query: options, icon, empty, render }: { query: ListQuery; icon: typeof MdPerson; empty: string; render: (item: RecItem) => ReactNode }) {
  const query = useInfiniteQuery(options)
  if (query.isPending) return <ListSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (query.data.items.length === 0) return <EmptyState icon={icon} message={empty} />
  return (
    <div className="-mx-2">
      <div className="px-2">
        <Count total={query.data.total} />
      </div>
      <VirtualList
        items={query.data.items}
        getKey={(i) => i.mbid}
        rowHeight={REC_ROW_HEIGHT}
        renderItem={render}
        hasMore={query.hasNextPage && !query.isFetchingNextPage}
        onLoadMore={query.fetchNextPage}
      />
    </div>
  )
}

function ReleaseGrid({
  query: options,
  handlers,
  onOpen,
  onPlay,
  showDate,
  icon = MdAlbum,
  empty,
}: {
  query: ListQuery
  handlers: RecHandlers
  onOpen: (item: RecItem) => void
  onPlay: (item: RecItem) => void
  showDate?: boolean
  icon?: typeof MdAlbum
  empty: string
}) {
  const query = useInfiniteQuery(options)
  if (query.isPending) return <GridSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (query.data.items.length === 0) return <EmptyState icon={icon} message={empty} />
  return (
    <>
      <Count total={query.data.total} />
      <VirtualGrid
        items={query.data.items}
        getKey={(i) => i.mbid}
        extraHeight={REC_CARD_CAPTION_HEIGHT + (query.data.items.some((i) => reasonText(i)) ? REC_CARD_REASON_HEIGHT : 0)}
        renderItem={(item) => <RecReleaseCard item={item} handlers={handlers} onOpen={onOpen} onPlay={onPlay} showDate={showDate} />}
        hasMore={query.hasNextPage && !query.isFetchingNextPage}
        onLoadMore={query.fetchNextPage}
      />
    </>
  )
}

function Count({ total }: { total: number }) {
  return <p className="mb-2 text-xs text-muted-foreground">{plural(total, 'result')}</p>
}

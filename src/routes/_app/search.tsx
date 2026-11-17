import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect, useState } from 'react'
import { MdCheck, MdClose, MdSearch, MdSearchOff } from 'react-icons/md'
import { z } from 'zod'
import { TabStrip } from '@/components/layout/TabStrip'
import { TopBarSlot } from '@/components/layout/TopBarSlot'
import { AlbumCard, ArtistCard } from '@/components/library/AlbumCard'
import { SongRow } from '@/components/library/SongRow'
import { EmptyState, ErrorState, GridSkeleton, ListSkeleton, SectionTitle } from '@/components/library/states'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { externalProvider, isExternalId } from '@/lib/subsonic/external'
import { looksLikeCover } from '@/lib/subsonic/relevance'
import { searchAlbumsQuery, searchArtistsQuery, searchSongsQuery } from '@/lib/subsonic/queries'
import { cn } from '@/lib/utils'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { useSubsonic } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

export const Route = createFileRoute('/_app/search')({
  staticData: { section: 'search' },
  validateSearch: z.object({ q: z.string().optional(), tab: z.enum(['albums', 'artists']).optional() }),
  component: SearchPage,
})

const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4'

/*
 * Searching hits Navidrome and, through Octo-Fiesta, the streaming provider,
 * so keep requests down: wait for a pause in typing, ignore 1-character
 * queries, and let Enter search right away. Superseded requests are aborted
 * and repeated queries come from the cache (TanStack Query).
 */
const SEARCH_DELAY_MS = 450
const MIN_QUERY_LENGTH = 2

function SearchPage() {
  const { q = '', tab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [input, setInput] = useState(q)
  const [settled, flush] = useDebouncedValue(input.trim(), SEARCH_DELAY_MS)
  const debounced = settled.length >= MIN_QUERY_LENGTH ? settled : ''

  // Keep the query in the URL (so back/forward and reloads work) without
  // adding a history entry per keystroke.
  useEffect(() => {
    if (debounced !== q) navigate({ search: (prev) => ({ ...prev, q: debounced || undefined }), replace: true })
  }, [debounced, q, navigate])

  return (
    <div className="px-4 pt-4 pb-10 md:px-6">
      {/* Search box + result-type tabs, inside the frosted top bar */}
      <TopBarSlot>
        <div className="px-4 pb-1 md:px-6">
          <div className="flex h-11 items-center gap-3 rounded-lg bg-foreground/5 px-3 ring-section focus-within:ring-2">
            <MdSearch className="size-5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && flush()}
              placeholder="Songs, albums, artists"
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {input && (
              <button type="button" onClick={() => setInput('')} aria-label="Clear search" className="text-muted-foreground hover:text-foreground">
                <MdClose className="size-5" />
              </button>
            )}
          </div>
        </div>
        <TabStrip
          inline
          tabs={[
            { label: 'Songs', link: { to: '/search', search: (p) => ({ ...p, tab: undefined }), activeOptions: { includeSearch: true, explicitUndefined: true } } },
            { label: 'Albums', link: { to: '/search', search: (p) => ({ ...p, tab: 'albums' as const }), activeOptions: { includeSearch: true, explicitUndefined: true } } },
            { label: 'Artists', link: { to: '/search', search: (p) => ({ ...p, tab: 'artists' as const }), activeOptions: { includeSearch: true, explicitUndefined: true } } },
          ]}
        />
      </TopBarSlot>

      {!debounced ? (
        <EmptyState icon={MdSearch} message={input.trim().length === 1 ? 'Keep typing…' : 'Search your library'} />
      ) : tab === 'albums' ? (
        <AlbumResults query={debounced} />
      ) : tab === 'artists' ? (
        <ArtistResults query={debounced} />
      ) : (
        <SongResults query={debounced} />
      )}
    </div>
  )
}

function SongResults({ query }: { query: string }) {
  const q = useQuery({ ...searchSongsQuery(useSubsonic(), query), placeholderData: keepPreviousData })
  if (q.isPending) return <ListSkeleton />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  return (
    <BySource
      items={q.data}
      query={query}
      dimmed={q.isPlaceholderData}
      texts={(s) => [s.title, s.album, s.artist]}
      render={(songs) => (
        <div className="-mx-2">
          {songs.map((s) => (
            // Only the clicked song: queueing its neighbours would make Octo-Fiesta
            // download unrelated results. "Play next" / "Add to queue" are in its ⋮ menu.
            <SongRow key={s.id} song={s} onPlay={() => player.playQueue([toTrack(s)], 0, { shuffle: false })} />
          ))}
        </div>
      )}
    />
  )
}

function AlbumResults({ query }: { query: string }) {
  const q = useQuery({ ...searchAlbumsQuery(useSubsonic(), query), placeholderData: keepPreviousData })
  if (q.isPending) return <GridSkeleton />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  return (
    <BySource
      items={q.data}
      query={query}
      dimmed={q.isPlaceholderData}
      texts={(a) => [a.name, a.artist]}
      render={(albums) => (
        <div className={gridClass}>
          {albums.map((a) => (
            <AlbumCard key={a.id} album={a} />
          ))}
        </div>
      )}
    />
  )
}

function ArtistResults({ query }: { query: string }) {
  const q = useQuery({ ...searchArtistsQuery(useSubsonic(), query), placeholderData: keepPreviousData })
  if (q.isPending) return <GridSkeleton />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  return (
    <BySource
      items={q.data}
      query={query}
      dimmed={q.isPlaceholderData}
      texts={(a) => [a.name]}
      render={(artists) => (
        <div className={gridClass}>
          {artists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      )}
    />
  )
}

/**
 * Splits results into "In your library" and streaming-provider results
 * (Octo-Fiesta), with filters: which source to show, and hiding the
 * karaoke/tribute/cover filler providers pad searches with (provider results
 * only; your library is never filtered).
 */
function BySource<T extends { id: string }>({
  items,
  query,
  dimmed,
  render,
  texts,
}: {
  items: T[]
  query: string
  dimmed: boolean
  render: (items: T[]) => ReactNode
  /** Title/album/artist of an item, for spotting covers. */
  texts: (item: T) => (string | undefined)[]
}) {
  const { searchSource, hideCovers, set } = useSettingsStore()
  if (items.length === 0) return <EmptyState icon={MdSearchOff} message={`Nothing found for “${query}”`} />

  const library = items.filter((i) => !isExternalId(i.id))
  const allExternal = items.filter((i) => isExternalId(i.id))
  const external = hideCovers ? allExternal.filter((i) => !looksLikeCover(...texts(i))) : allExternal
  const hidden = allExternal.length - external.length
  const provider = externalProvider(allExternal[0]?.id)

  if (allExternal.length === 0) return <div className={cn('transition-opacity', dimmed && 'opacity-60')}>{render(library)}</div>

  const showLibrary = searchSource !== 'external' && library.length > 0
  const showExternal = searchSource !== 'library'

  return (
    <div className={cn('flex flex-col gap-8 transition-opacity', dimmed && 'opacity-60')}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['all', 'All'],
            ['library', 'Library'],
            ['external', provider ?? 'Streaming'],
          ] as const
        ).map(([value, label]) => (
          <Chip key={value} active={searchSource === value} onClick={() => set({ searchSource: value })}>
            {label}
          </Chip>
        ))}
        {showExternal && (
          <Chip active={hideCovers} onClick={() => set({ hideCovers: !hideCovers })} title="Karaoke, tributes, “made famous by” covers, lullaby and 8-bit versions…">
            {hideCovers ? <MdCheck className="size-3.5" /> : null} Hide covers & karaoke{hideCovers && hidden > 0 ? ` (${hidden})` : ''}
          </Chip>
        )}
      </div>

      {showLibrary && (
        <section>
          <SectionTitle>In your library</SectionTitle>
          {render(library)}
        </section>
      )}
      {showExternal && (
        <section>
          <SectionTitle action={<span className="text-xs text-muted-foreground">Downloaded to your server when played</span>}>
            From {provider}
          </SectionTitle>
          {external.length > 0 ? (
            render(external)
          ) : (
            <p className="py-6 text-sm text-muted-foreground">Only covers and karaoke versions found ({hidden} hidden).</p>
          )}
        </section>
      )}
      {searchSource === 'library' && library.length === 0 && (
        <p className="py-6 text-sm text-muted-foreground">Nothing in your library for “{query}”.</p>
      )}
    </div>
  )
}

function Chip({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors',
        active ? 'border-transparent bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

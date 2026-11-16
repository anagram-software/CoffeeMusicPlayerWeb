import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MdClose, MdSearch, MdSearchOff } from 'react-icons/md'
import { z } from 'zod'
import { AlbumCard, ArtistCard } from '@/components/library/AlbumCard'
import { SongRow } from '@/components/library/SongRow'
import { EmptyState, ErrorState, ListSkeleton, SectionTitle } from '@/components/library/states'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchQuery } from '@/lib/subsonic/queries'
import { useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/search')({
  staticData: { section: 'search' },
  validateSearch: z.object({ q: z.string().optional() }),
  component: SearchPage,
})

const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4'

function SearchPage() {
  const { q = '' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [input, setInput] = useState(q)
  const debounced = useDebouncedValue(input.trim(), 300)

  // Keep the query in the URL (so back/forward and reloads work) without
  // adding a history entry per keystroke.
  useEffect(() => {
    if (debounced !== q) navigate({ search: { q: debounced || undefined }, replace: true })
  }, [debounced, q, navigate])

  const query = useQuery({ ...searchQuery(useSubsonic(), debounced), placeholderData: keepPreviousData })
  const results = query.data
  const nothing = results && !results.artists.length && !results.albums.length && !results.songs.length

  return (
    <div className="px-4 pb-10 md:px-6">
      <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex h-11 items-center gap-3 rounded-lg bg-white/5 px-3 ring-section focus-within:ring-2">
          <MdSearch className="size-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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

      {!debounced ? (
        <EmptyState icon={MdSearch} message="Search your library" />
      ) : query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : nothing ? (
        <EmptyState icon={MdSearchOff} message={`Nothing found for “${debounced}”`} />
      ) : (
        <div className={`mt-4 flex flex-col gap-10 transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
          {results!.songs.length > 0 && (
            <section>
              <SectionTitle>Songs</SectionTitle>
              <div className="-mx-2">
                {results!.songs.map((s) => (
                  <SongRow key={s.id} song={s} />
                ))}
              </div>
            </section>
          )}
          {results!.albums.length > 0 && (
            <section>
              <SectionTitle>Albums</SectionTitle>
              <div className={gridClass}>
                {results!.albums.map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
              </div>
            </section>
          )}
          {results!.artists.length > 0 && (
            <section>
              <SectionTitle>Artists</SectionTitle>
              <div className={gridClass}>
                {results!.artists.map((a) => (
                  <ArtistCard key={a.id} artist={a} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

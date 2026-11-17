import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, type LinkProps } from '@tanstack/react-router'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { MdChevronLeft, MdChevronRight, MdShuffle } from 'react-icons/md'
import { AlbumCard, PlaylistCard } from '@/components/library/AlbumCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type AlbumSort, albumPreviewQuery, playlistsQuery, randomSongsQuery } from '@/lib/subsonic/queries'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { getClient, useSessionStore, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/')({
  staticData: { section: 'home' },
  loader: ({ context }) => context.queryClient.prefetchQuery(albumPreviewQuery(getClient(), 'newest')),
  component: HomePage,
})

/** The "What are we listening to?" banner; disabled for now. */
const SHOW_SHUFFLE_CARD = false

const albumRows: { sort: AlbumSort; title: string }[] = [
  { sort: 'newest', title: 'Recently added' },
  { sort: 'recent', title: 'Recently played' },
  { sort: 'frequent', title: 'Most played' },
]

function HomePage() {
  return (
    <div className="flex flex-col gap-8 px-4 pt-2 pb-10 md:px-6">
      {SHOW_SHUFFLE_CARD && <ShuffleCard />}
      {albumRows.map((r) => (
        <AlbumRow key={r.sort} sort={r.sort} title={r.title} />
      ))}
      <PlaylistRow />
      <AlbumRow sort="random" title="Discover" />
    </div>
  )
}

/** The Android home info card, turned into "shuffle my library". */
function ShuffleCard() {
  const client = useSubsonic()
  const queryClient = useQueryClient()
  const name = useSessionStore((s) => s.session?.user.name)
  const [loading, setLoading] = useState(false)

  const shuffle = async () => {
    setLoading(true)
    try {
      const songs = await queryClient.fetchQuery(randomSongsQuery(client, 200))
      player.playQueue(songs.map(toTrack), 0, { shuffle: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative overflow-hidden rounded-xl bg-[#448aff] p-6 text-white md:p-8">
      <div aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -right-24 -bottom-24 size-72 rounded-full bg-white/10" />
      <p className="relative text-sm text-white/80">{greeting()}{name ? `, ${name}` : ''}</p>
      <h1 className="relative mt-1 text-3xl font-light md:text-4xl">What are we listening to?</h1>
      <button
        type="button"
        onClick={shuffle}
        disabled={loading}
        className="relative mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium tracking-wider text-[#1a1a1a] uppercase transition-transform hover:scale-105 disabled:opacity-70"
      >
        <MdShuffle className="size-5" /> {loading ? 'Shuffling…' : 'Shuffle library'}
      </button>
    </section>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function AlbumRow({ sort, title }: { sort: AlbumSort; title: string }) {
  const { data, isPending } = useQuery(albumPreviewQuery(useSubsonic(), sort))
  if (!isPending && !data?.length) return null // e.g. nothing played yet
  return (
    <Row title={title} seeAll={{ to: '/library/albums', search: { sort } }} loading={isPending}>
      {data?.map((a) => (
        <RowItem key={a.id}>
          <AlbumCard album={a} />
        </RowItem>
      ))}
    </Row>
  )
}

function PlaylistRow() {
  const { data, isPending } = useQuery(playlistsQuery(useSubsonic()))
  const username = useSessionStore((s) => s.session?.user.name)
  if (!isPending && !data?.length) return null
  // Most recently changed first.
  const recent = [...(data ?? [])].sort((a, b) => String(b.changed).localeCompare(String(a.changed))).slice(0, 18)
  return (
    <Row title="Playlists" seeAll={{ to: '/playlists' }} loading={isPending}>
      {recent.map((p) => (
        <RowItem key={p.id}>
          <PlaylistCard playlist={p} showOwner={p.owner !== username} />
        </RowItem>
      ))}
    </Row>
  )
}

/** A titled, horizontally scrolling row of cards, with ‹ › buttons that move one card at a time. */
function Row({ title, seeAll, loading, children }: { title: string; seeAll: LinkProps; loading: boolean; children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  // Track whether there's more to scroll either way, to disable the arrows at the ends.
  const updateEdges = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateEdges()
    const ro = new ResizeObserver(updateEdges)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateEdges, loading])

  const step = (dir: 1 | -1) => {
    const el = scrollerRef.current
    const item = el?.firstElementChild as HTMLElement | null
    if (!el || !item) return
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    el.scrollBy({ left: dir * (item.offsetWidth + gap), behavior: 'smooth' })
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wider text-section uppercase">{title}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} disabled={edges.start} aria-label={`Scroll ${title} left`}>
            <MdChevronLeft className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => step(1)} disabled={edges.end} aria-label={`Scroll ${title} right`}>
            <MdChevronRight className="size-5" />
          </Button>
          <Link {...seeAll} className="ml-2 flex items-center text-xs text-muted-foreground hover:text-foreground">
            See all
          </Link>
        </div>
      </div>
      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-6 md:scroll-px-6 md:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {loading
          ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-square w-40 shrink-0 rounded-md md:w-44" />)
          : children}
      </div>
    </section>
  )
}

function RowItem({ children }: { children: ReactNode }) {
  return <div className="w-40 shrink-0 snap-start md:w-44">{children}</div>
}

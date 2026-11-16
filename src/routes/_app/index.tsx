import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, type LinkProps } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { MdChevronRight, MdShuffle } from 'react-icons/md'
import { AlbumCard, PlaylistCard } from '@/components/library/AlbumCard'
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

const albumRows: { sort: AlbumSort; title: string }[] = [
  { sort: 'newest', title: 'Recently added' },
  { sort: 'recent', title: 'Recently played' },
  { sort: 'frequent', title: 'Most played' },
]

function HomePage() {
  return (
    <div className="flex flex-col gap-8 px-4 pt-2 pb-10 md:px-6">
      <ShuffleCard />
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

/** A titled, horizontally scrolling row of cards. */
function Row({ title, seeAll, loading, children }: { title: string; seeAll: LinkProps; loading: boolean; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-wider text-section uppercase">{title}</h2>
        <Link {...seeAll} className="flex items-center text-xs text-muted-foreground hover:text-foreground">
          See all <MdChevronRight className="size-4" />
        </Link>
      </div>
      <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:scroll-px-6 md:px-6 [scrollbar-width:thin]">
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

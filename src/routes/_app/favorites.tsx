import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MdAlbum, MdFavoriteBorder, MdPerson } from 'react-icons/md'
import { z } from 'zod'
import { TabStrip } from '@/components/layout/TabStrip'
import { AlbumCard, ArtistCard } from '@/components/library/AlbumCard'
import { ShuffleAllRow } from '@/components/library/ShuffleAllRow'
import { SONG_ROW_HEIGHT, SongRow } from '@/components/library/SongRow'
import { EmptyState, ErrorState, GridSkeleton, ListSkeleton } from '@/components/library/states'
import { VirtualGrid } from '@/components/library/VirtualGrid'
import { VirtualList } from '@/components/library/VirtualList'
import { starredQuery } from '@/lib/subsonic/queries'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { getClient, useSubsonic } from '@/stores/session'

export const Route = createFileRoute('/_app/favorites')({
  staticData: { section: 'favorites' },
  validateSearch: z.object({ tab: z.enum(['albums', 'artists']).optional() }),
  loader: ({ context }) => context.queryClient.prefetchQuery(starredQuery(getClient())),
  component: FavoritesPage,
})

function FavoritesPage() {
  const { tab } = Route.useSearch()
  const query = useQuery(starredQuery(useSubsonic()))

  return (
    <div className="flex flex-col">
      <TabStrip
        tabs={[
          { label: 'Songs', link: { to: '/favorites', search: {}, activeOptions: { includeSearch: true } } },
          { label: 'Albums', link: { to: '/favorites', search: { tab: 'albums' }, activeOptions: { includeSearch: true } } },
          { label: 'Artists', link: { to: '/favorites', search: { tab: 'artists' }, activeOptions: { includeSearch: true } } },
        ]}
      />
      <div className="px-2 py-4 md:px-4">
        {query.isPending ? (
          tab ? <GridSkeleton /> : <ListSkeleton />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : tab === 'albums' ? (
          query.data.albums.length === 0 ? (
            <EmptyState icon={MdAlbum} message="No favorite albums yet. Tap the heart on an album to add it." />
          ) : (
            <div className="px-2">
              <VirtualGrid items={query.data.albums} getKey={(a) => a.id} renderItem={(a) => <AlbumCard album={a} />} />
            </div>
          )
        ) : tab === 'artists' ? (
          query.data.artists.length === 0 ? (
            <EmptyState icon={MdPerson} message="No favorite artists yet." />
          ) : (
            <div className="px-2">
              <VirtualGrid items={query.data.artists} getKey={(a) => a.id} renderItem={(a) => <ArtistCard artist={a} />} />
            </div>
          )
        ) : query.data.songs.length === 0 ? (
          <EmptyState icon={MdFavoriteBorder} message="No favorite songs yet. Tap the heart in the player to add one." />
        ) : (
          <>
            <ShuffleAllRow
              count={query.data.songs.length}
              onShuffle={() => {
                const tracks = query.data.songs.map(toTrack)
                player.playQueue(tracks, Math.floor(Math.random() * tracks.length), { shuffle: true })
              }}
            />
            <VirtualList
              items={query.data.songs}
              getKey={(s) => s.id}
              rowHeight={SONG_ROW_HEIGHT}
              renderItem={(s, i) => <SongRow song={s} onPlay={() => player.playQueue(query.data.songs.map(toTrack), i)} />}
            />
          </>
        )}
      </div>
    </div>
  )
}

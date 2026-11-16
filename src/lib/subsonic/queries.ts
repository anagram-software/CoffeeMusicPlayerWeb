import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type {
  AlbumList2,
  AlbumWithSongsID3,
  ArtistInfo2,
  ArtistsID3,
  ArtistWithAlbumsID3,
  Directory,
  Genres,
  Indexes,
  SearchResult3,
  Songs,
  TopSongs,
} from 'subsonic-api'
import type { SubsonicClient } from './client'

/*
 * Query definitions for TanStack Query. Each factory takes the client and
 * returns options usable with useQuery / useSuspenseQuery / ensureQueryData
 * (in route loaders). Keys don't include the account: the cache is cleared
 * on logout (see lib/queryClient.ts).
 */

const PAGE_SIZE = 200

export const albumSorts = {
  alphabeticalByName: 'Name',
  alphabeticalByArtist: 'Artist',
  newest: 'Recently added',
  recent: 'Recently played',
  frequent: 'Most played',
  highest: 'Top rated',
  byYear: 'Year',
  random: 'Random',
} as const
export type AlbumSort = keyof typeof albumSorts

function albumListParams(sort: AlbumSort) {
  // byYear requires a range; from > to gives newest first.
  return sort === 'byYear' ? { type: sort, fromYear: 9999, toYear: 0 } : { type: sort }
}

export const albumListQuery = (c: SubsonicClient, sort: AlbumSort) =>
  infiniteQueryOptions({
    queryKey: ['albumList', sort],
    queryFn: async ({ pageParam, signal }) => {
      const r = await c.get<{ albumList2: AlbumList2 }>(
        'getAlbumList2',
        { ...albumListParams(sort), size: PAGE_SIZE, offset: pageParam },
        { signal },
      )
      return r.albumList2.album ?? []
    },
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE),
    select: (data) => data.pages.flat(),
    // A random list that reshuffles on every refetch would be disorienting.
    staleTime: sort === 'random' ? Infinity : undefined,
  })

/** All songs. Subsonic has no "list songs" call; Navidrome returns everything for an empty search3 query. */
export const songListQuery = (c: SubsonicClient) =>
  infiniteQueryOptions({
    queryKey: ['songList'],
    queryFn: async ({ pageParam, signal }) => {
      const r = await c.get<{ searchResult3: SearchResult3 }>(
        'search3',
        { query: '', songCount: PAGE_SIZE, songOffset: pageParam, albumCount: 0, artistCount: 0 },
        { signal },
      )
      return r.searchResult3.song ?? []
    },
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE),
    select: (data) => data.pages.flat(),
  })

export const artistListQuery = (c: SubsonicClient) =>
  queryOptions({
    queryKey: ['artistList'],
    queryFn: async ({ signal }) => {
      const r = await c.get<{ artists: ArtistsID3 }>('getArtists', {}, { signal })
      return (r.artists.index ?? []).flatMap((i) => i.artist ?? [])
    },
  })

export const genreListQuery = (c: SubsonicClient) =>
  queryOptions({
    queryKey: ['genreList'],
    queryFn: async ({ signal }) => {
      const r = await c.get<{ genres: Genres }>('getGenres', {}, { signal })
      return (r.genres.genre ?? []).sort((a, b) => a.value.localeCompare(b.value))
    },
  })

export const genreAlbumsQuery = (c: SubsonicClient, genre: string, size = 500) =>
  queryOptions({
    queryKey: ['genreAlbums', genre, size],
    queryFn: async ({ signal }) => {
      const r = await c.get<{ albumList2: AlbumList2 }>('getAlbumList2', { type: 'byGenre', genre, size }, { signal })
      return r.albumList2.album ?? []
    },
  })

export const genreSongsQuery = (c: SubsonicClient, genre: string) =>
  infiniteQueryOptions({
    queryKey: ['genreSongs', genre],
    queryFn: async ({ pageParam, signal }) => {
      const r = await c.get<{ songsByGenre: Songs }>(
        'getSongsByGenre',
        { genre, count: PAGE_SIZE, offset: pageParam },
        { signal },
      )
      return r.songsByGenre.song ?? []
    },
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE),
    select: (data) => data.pages.flat(),
  })

export const albumQuery = (c: SubsonicClient, id: string) =>
  queryOptions({
    queryKey: ['album', id],
    queryFn: async ({ signal }) => (await c.get<{ album: AlbumWithSongsID3 }>('getAlbum', { id }, { signal })).album,
  })

export const artistQuery = (c: SubsonicClient, id: string) =>
  queryOptions({
    queryKey: ['artist', id],
    queryFn: async ({ signal }) =>
      (await c.get<{ artist: ArtistWithAlbumsID3 }>('getArtist', { id }, { signal })).artist,
  })

export const artistInfoQuery = (c: SubsonicClient, id: string) =>
  queryOptions({
    queryKey: ['artistInfo', id],
    queryFn: async ({ signal }) =>
      (await c.get<{ artistInfo2: ArtistInfo2 }>('getArtistInfo2', { id, count: 12 }, { signal })).artistInfo2,
    staleTime: 60 * 60 * 1000,
  })

/** `id` is used by servers with the topSongsByArtistId extension (Navidrome); others match by name. */
export const topSongsQuery = (c: SubsonicClient, artistId: string, artistName: string) =>
  queryOptions({
    queryKey: ['topSongs', artistId],
    queryFn: async ({ signal }) =>
      (await c.get<{ topSongs: TopSongs }>('getTopSongs', { id: artistId, artist: artistName, count: 10 }, { signal }))
        .topSongs.song ?? [],
    staleTime: 60 * 60 * 1000,
  })

/** Root of the folder browser. On Navidrome these "folders" are artists → albums → songs. */
export const indexesQuery = (c: SubsonicClient) =>
  queryOptions({
    queryKey: ['indexes'],
    queryFn: async ({ signal }) => {
      const r = await c.get<{ indexes: Indexes }>('getIndexes', {}, { signal })
      const dirs = (r.indexes.index ?? []).flatMap((i) => i.artist ?? [])
      return {
        // No art at the root: these are folders, shown with a folder icon.
        dirs: dirs.map((d) => ({ id: d.id, name: d.name })),
        files: r.indexes.child ?? [],
      }
    },
  })

export const directoryQuery = (c: SubsonicClient, id: string) =>
  queryOptions({
    queryKey: ['directory', id],
    queryFn: async ({ signal }) =>
      (await c.get<{ directory: Directory }>('getMusicDirectory', { id }, { signal })).directory,
  })

export const searchQuery = (c: SubsonicClient, query: string) =>
  queryOptions({
    queryKey: ['search', query],
    queryFn: async ({ signal }) => {
      const r = await c.get<{ searchResult3: SearchResult3 }>(
        'search3',
        { query, artistCount: 12, albumCount: 18, songCount: 50 },
        { signal },
      )
      return {
        artists: r.searchResult3.artist ?? [],
        albums: r.searchResult3.album ?? [],
        songs: r.searchResult3.song ?? [],
      }
    },
    enabled: query.trim().length > 0,
  })


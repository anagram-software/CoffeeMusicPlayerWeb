import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type {
  AlbumList2,
  AlbumWithSongsID3,
  ArtistInfo2,
  ArtistsID3,
  ArtistWithAlbumsID3,
  Child,
  Genres,
  Playlist,
  Playlists,
  PlaylistWithSongs,
  Starred2,
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

/** A single song's full details (e.g. file format/quality for tracks queued without them). */
export const songQuery = (c: SubsonicClient, id: string) =>
  queryOptions({
    queryKey: ['song', id],
    queryFn: async ({ signal }) => (await c.get<{ song: Child }>('getSong', { id }, { signal })).song,
    staleTime: Infinity,
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

/*
 * Search, one result kind per query, so each search tab asks only for what
 * it shows (with Octo-Fiesta, every search also hits the streaming provider).
 */
function search3(c: SubsonicClient, query: string, counts: { songCount?: number; albumCount?: number; artistCount?: number }, signal: AbortSignal) {
  return c
    .get<{ searchResult3: SearchResult3 }>('search3', { query, songCount: 0, albumCount: 0, artistCount: 0, ...counts }, { signal })
    .then((r) => r.searchResult3)
}

export const searchSongsQuery = (c: SubsonicClient, query: string) =>
  queryOptions({
    queryKey: ['search', 'songs', query],
    queryFn: async ({ signal }) => (await search3(c, query, { songCount: 100 }, signal)).song ?? [],
    enabled: query.trim().length > 0,
  })

export const searchAlbumsQuery = (c: SubsonicClient, query: string) =>
  queryOptions({
    queryKey: ['search', 'albums', query],
    queryFn: async ({ signal }) => (await search3(c, query, { albumCount: 60 }, signal)).album ?? [],
    enabled: query.trim().length > 0,
  })

export const searchArtistsQuery = (c: SubsonicClient, query: string) =>
  queryOptions({
    queryKey: ['search', 'artists', query],
    queryFn: async ({ signal }) => (await search3(c, query, { artistCount: 60 }, signal)).artist ?? [],
    enabled: query.trim().length > 0,
  })


/** A short album list for Home rows ("Recently added", "Most played", …). */
export const albumPreviewQuery = (c: SubsonicClient, sort: AlbumSort, size = 18) =>
  queryOptions({
    queryKey: ['albumPreview', sort, size],
    queryFn: async ({ signal }) => {
      const r = await c.get<{ albumList2: AlbumList2 }>('getAlbumList2', { ...albumListParams(sort), size }, { signal })
      return r.albumList2.album ?? []
    },
    staleTime: sort === 'random' ? Infinity : undefined,
  })

export const randomSongsQuery = (c: SubsonicClient, size = 100) =>
  queryOptions({
    queryKey: ['randomSongs', size],
    queryFn: async ({ signal }) =>
      (await c.get<{ randomSongs: Songs }>('getRandomSongs', { size }, { signal })).randomSongs.song ?? [],
    staleTime: 0,
  })

export const starredQuery = (c: SubsonicClient) =>
  queryOptions({
    queryKey: ['starred'],
    queryFn: async ({ signal }) => {
      const r = await c.get<{ starred2: Starred2 }>('getStarred2', {}, { signal })
      return { songs: r.starred2.song ?? [], albums: r.starred2.album ?? [], artists: r.starred2.artist ?? [] }
    },
  })

/** Navidrome adds `readonly` (smart playlists, or playlists owned by someone else). */
export type PlaylistInfo = Playlist & { readonly?: boolean }

export const playlistsQuery = (c: SubsonicClient) =>
  queryOptions({
    queryKey: ['playlists'],
    queryFn: async ({ signal }) =>
      ((await c.get<{ playlists: Playlists }>('getPlaylists', {}, { signal })).playlists.playlist ?? []) as PlaylistInfo[],
  })

export const playlistQuery = (c: SubsonicClient, id: string) =>
  queryOptions({
    queryKey: ['playlist', id],
    queryFn: async ({ signal }) =>
      (await c.get<{ playlist: PlaylistWithSongs }>('getPlaylist', { id }, { signal })).playlist as PlaylistWithSongs & {
        readonly?: boolean
      },
  })

import { queryOptions } from '@tanstack/react-query'
import type { AlbumID3, ArtistID3, Child, SearchResult3 } from 'subsonic-api'
import type { SubsonicClient } from '@/lib/subsonic/client'
import { isExternalId } from '@/lib/subsonic/external'
import { artistMatches, coreTitle, normalise, pickMatch, searchTitle } from '@/lib/subsonic/match'
import type { RecItem } from './client'

/*
 * Recommendations are MusicBrainz items. To open or play one we look it up on
 * the Subsonic server with search3: a library item if there is one, otherwise
 * (through Octo-Fiesta) a streaming-provider item. Only on click, since each
 * search through Octo-Fiesta also queries the provider.
 */

/** Credited artist names, e.g. ["Daft Punk", "Pharrell Williams"]. */
export function creditNames(item: RecItem): string[] {
  return (item.artist_credit ?? []).map((a) => a.name ?? '').filter(Boolean)
}

const sameArtist = (a: string, b: string) => {
  const strip = (s: string) => normalise(s).replace(/^the /, '')
  return !!strip(a) && strip(a) === strip(b)
}

/** Library first, then the server's order. */
function best<T extends { id: string }>(matches: T[]): T | undefined {
  return matches.find((m) => !isExternalId(m.id)) ?? matches[0]
}

export function pickArtist(name: string, candidates: ArtistID3[]): ArtistID3 | undefined {
  return best(candidates.filter((a) => sameArtist(name, a.name)))
}

export function pickAlbum(wanted: { title: string; artists: string[] }, candidates: AlbumID3[]): AlbumID3 | undefined {
  const byArtist = (a: AlbumID3) =>
    wanted.artists.length === 0 || wanted.artists.some((w) => [a.artist, a.displayArtist].some((n) => n && artistMatches(w, n)))
  const exact = candidates.filter((a) => byArtist(a) && normalise(a.name) === normalise(wanted.title))
  // "Album (Deluxe Edition)" / "Album - Remastered" when the plain edition isn't there.
  return best(exact) ?? best(candidates.filter((a) => byArtist(a) && coreTitle(a.name) === coreTitle(wanted.title)))
}

async function search3(c: SubsonicClient, query: string, counts: Record<string, number>, signal: AbortSignal) {
  const r = await c.get<{ searchResult3: SearchResult3 }>('search3', { query, songCount: 0, albumCount: 0, artistCount: 0, ...counts }, { signal })
  return r.searchResult3
}

/** The server's artist for a recommended artist, or null if search finds none. */
export const resolveArtistQuery = (c: SubsonicClient, item: RecItem) =>
  queryOptions({
    queryKey: ['recsResolve', 'artist', item.mbid],
    queryFn: async ({ signal }): Promise<ArtistID3 | null> =>
      pickArtist(item.name, (await search3(c, item.name, { artistCount: 20 }, signal)).artist ?? []) ?? null,
    staleTime: 10 * 60 * 1000,
  })

export const resolveAlbumQuery = (c: SubsonicClient, item: RecItem) =>
  queryOptions({
    queryKey: ['recsResolve', 'album', item.mbid],
    queryFn: async ({ signal }): Promise<AlbumID3 | null> => {
      const artists = creditNames(item)
      const query = [artists[0], searchTitle(item.name)].filter(Boolean).join(' ')
      const found = (await search3(c, query, { albumCount: 20 }, signal)).album ?? []
      return pickAlbum({ title: item.name, artists }, found) ?? null
    },
    staleTime: 10 * 60 * 1000,
  })

export const resolveSongQuery = (c: SubsonicClient, item: RecItem) =>
  queryOptions({
    queryKey: ['recsResolve', 'song', item.mbid],
    queryFn: async ({ signal }): Promise<Child | null> => {
      const artist = creditNames(item)[0] ?? ''
      const query = [artist, searchTitle(item.name)].filter(Boolean).join(' ')
      const found = (await search3(c, query, { songCount: 20 }, signal)).song ?? []
      return pickMatch({ artist, title: item.name }, found) ?? null
    },
    staleTime: 10 * 60 * 1000,
  })

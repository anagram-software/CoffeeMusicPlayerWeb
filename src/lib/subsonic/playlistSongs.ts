import type { PlaylistWithSongs } from 'subsonic-api'
import { useSessionStore } from '@/stores/session'
import { SubsonicError, type SubsonicClient } from './client'
import { isExternalId, OCTO_FIESTA_EXTENSION } from './external'

/*
 * Adding songs to playlists, working around Octo-Fiesta.
 *
 * Octo-Fiesta handles updatePlaylist itself: it joins repeated `songIdToAdd`
 * parameters into one comma-separated value, resolves external ids (downloading
 * the song and waiting for the library scan), and relays a single
 * `songIdToAdd=a,b` to Navidrome, which reads it as one unknown id. So behind
 * the proxy, songs go one per call. createPlaylist is relayed untouched, which
 * keeps batches intact but leaves external ids unresolved, so playlists with
 * external songs are created empty and filled through updatePlaylist.
 */

/** True when adds must go one per call: the server is behind Octo-Fiesta, or the songs include external ones. */
export function needsOneByOne(songIds: string[]): boolean {
  const extensions = useSessionStore.getState().session?.server.extensions ?? []
  return extensions.includes(OCTO_FIESTA_EXTENSION) || songIds.some(isExternalId)
}

export interface AppendResult {
  added: number
  /** Ids that couldn't be added (e.g. an external song that failed to download). */
  failed: string[]
}

/**
 * Appends songs to a playlist in the given order. One call when possible;
 * otherwise one per song, carrying on past individual failures (auth errors
 * still throw). `onProgress` is called before each song in one-by-one mode.
 */
export async function appendSongs(
  client: SubsonicClient,
  playlistId: string,
  songIds: string[],
  onProgress?: (index: number, songId: string) => void,
): Promise<AppendResult> {
  if (songIds.length === 0) return { added: 0, failed: [] }
  if (!needsOneByOne(songIds)) {
    await client.get('updatePlaylist', { playlistId, songIdToAdd: songIds })
    return { added: songIds.length, failed: [] }
  }

  const failed: string[] = []
  for (const [i, id] of songIds.entries()) {
    onProgress?.(i, id)
    try {
      await client.get('updatePlaylist', { playlistId, songIdToAdd: id })
    } catch (e) {
      if (e instanceof SubsonicError && e.isAuthError) throw e
      failed.push(id)
    }
  }
  if (failed.length === songIds.length) throw new SubsonicError(0, `Couldn't add ${songIds.length === 1 ? 'the song' : 'any of the songs'} to the playlist`)
  return { added: songIds.length - failed.length, failed }
}

/** Creates a playlist with songs, in order (see the note above for why it's sometimes two steps). */
export async function createPlaylistWithSongs(
  client: SubsonicClient,
  name: string,
  songIds: string[],
  onProgress?: (index: number, songId: string) => void,
): Promise<{ playlist: PlaylistWithSongs } & AppendResult> {
  if (!needsOneByOne(songIds)) {
    const { playlist } = await client.get<{ playlist: PlaylistWithSongs }>('createPlaylist', { name, songId: songIds })
    return { playlist, added: songIds.length, failed: [] }
  }
  const { playlist } = await client.get<{ playlist: PlaylistWithSongs }>('createPlaylist', { name })
  // The playlist exists now; report partial failures rather than throwing them away.
  const result = await appendSongs(client, playlist.id, songIds, onProgress).catch((e: Error) => {
    if (e instanceof SubsonicError && e.isAuthError) throw e
    return { added: 0, failed: songIds }
  })
  return { playlist, ...result }
}

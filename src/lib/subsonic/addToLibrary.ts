import type { AlbumWithSongsID3 } from 'subsonic-api'
import { create } from 'zustand'
import type { SubsonicClient } from './client'
import { isExternalId } from './external'

/** Albums asked to be added this session (download progress isn't reported, so this is just "requested"). */
export const useAddedAlbums = create<{ ids: Set<string> }>(() => ({ ids: new Set() }))

/** Songs in the album that come from the streaming provider, i.e. not in the library yet. */
export function missingSongs(album: AlbumWithSongsID3) {
  return (album.song ?? []).filter((s) => isExternalId(s.id))
}

/**
 * Makes Octo-Fiesta download an album's missing songs into the library.
 *
 * Preferred: star the external album, which Octo-Fiesta turns into a full
 * background download (permanent storage, even in Cache mode) without
 * forwarding a favourite to Navidrome. Fallback when there's no external album
 * id: start streaming each missing song and drop the connection once it
 * begins; Octo-Fiesta finishes downloads even if the client disconnects.
 *
 * Returns how many songs were requested.
 */
export async function addAlbumToLibrary(client: SubsonicClient, album: AlbumWithSongsID3): Promise<number> {
  const missing = missingSongs(album)
  const externalAlbumId = isExternalId(album.id) ? album.id : missing.find((s) => isExternalId(s.albumId))?.albumId

  if (externalAlbumId) {
    await client.get('star', { albumId: externalAlbumId })
  } else {
    for (const song of missing) await primeDownload(client, song.id)
  }
  useAddedAlbums.setState((s) => ({ ids: new Set(s.ids).add(album.id) }))
  return missing.length
}

/** Request the stream, then disconnect as soon as it starts: the server keeps downloading. */
async function primeDownload(client: SubsonicClient, id: string) {
  const controller = new AbortController()
  try {
    await fetch(client.url('stream', { id }), { signal: controller.signal })
  } catch {
    // A failed song shouldn't stop the rest.
  } finally {
    controller.abort()
  }
}

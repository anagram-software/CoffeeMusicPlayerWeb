import type { Child, PlaylistWithSongs, SearchResult3 } from 'subsonic-api'
import { toast } from 'sonner'
import type { LastfmTrack } from '@/lib/lastfm'
import { plural } from '@/lib/format'
import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/stores/session'
import { SubsonicError, type SubsonicClient } from './client'
import { isExternalId } from './external'
import { pickMatch, searchTitle } from './match'
import { appendSongs } from './playlistSongs'

export interface MatchedTrack {
  wanted: LastfmTrack
  /** Library or streaming-provider song; undefined when nothing matched. */
  song?: Child
}

/** Searches run in parallel; each also hits the streaming provider through Octo-Fiesta, so keep it modest. */
const SEARCH_CONCURRENCY = 4

async function search(client: SubsonicClient, query: string, signal: AbortSignal): Promise<Child[]> {
  const res = await client.get<{ searchResult3: SearchResult3 }>('search3', { query, songCount: 20, albumCount: 0, artistCount: 0 }, { signal })
  return res.searchResult3?.song ?? []
}

/** Finds one track: "artist title" first, then the title alone (search terms can trip over artist spellings). */
async function findSong(client: SubsonicClient, wanted: LastfmTrack, signal: AbortSignal): Promise<Child | undefined> {
  const title = searchTitle(wanted.title)
  return (
    pickMatch(wanted, await search(client, `${wanted.artist} ${title}`, signal)) ??
    pickMatch(wanted, await search(client, title, signal))
  )
}

/** Matches every track, in order. A failed search counts as "not found" rather than failing the lot. */
export async function matchTracks(
  client: SubsonicClient,
  tracks: LastfmTrack[],
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<MatchedTrack[]> {
  const results: MatchedTrack[] = tracks.map((wanted) => ({ wanted }))
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < tracks.length) {
      const i = next++
      try {
        results[i].song = await findSong(client, tracks[i], signal)
      } catch (e) {
        if (signal.aborted) throw e
        if (e instanceof SubsonicError && e.isAuthError) throw e
      }
      onProgress(++done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(SEARCH_CONCURRENCY, tracks.length) }, worker))
  return results
}

/**
 * Creates the playlist and adds the songs, reporting progress in a toast. Runs
 * in the background so the dialog can close. Behind Octo-Fiesta songs go one
 * per call (see playlistSongs.ts), and each external one downloads and waits
 * for the library scan, so this can take a while.
 */
export async function importPlaylist(
  client: SubsonicClient,
  { name, comment, songs, onOpen }: { name: string; comment?: string; songs: Child[]; onOpen: (playlistId: string) => void },
) {
  const toastId = toast.loading(`Importing “${name}”`, { description: 'Creating playlist…', duration: Infinity })
  const refresh = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['playlists'] })
    if (id) queryClient.invalidateQueries({ queryKey: ['playlist', id] })
  }

  let playlistId: string
  try {
    playlistId = (await client.get<{ playlist: PlaylistWithSongs }>('createPlaylist', { name })).playlist.id
    if (comment) await client.get('updatePlaylist', { playlistId, comment })
  } catch (e) {
    toast.error(`Couldn't create “${name}”`, { id: toastId, description: (e as Error).message, duration: 8000 })
    return
  }
  refresh()

  let failedIds: string[]
  try {
    const result = await appendSongs(
      client,
      playlistId,
      songs.map((s) => s.id),
      (i, id) => {
        toast.loading(`Importing “${name}”`, {
          id: toastId,
          description: `${i + 1} of ${songs.length}: ${songs[i].title}${isExternalId(id) ? ' (downloading)' : ''}`,
          duration: Infinity,
        })
        // Let an open playlist page fill in as songs arrive.
        if (i > 0 && i % 10 === 0) refresh(playlistId)
      },
    )
    failedIds = result.failed
  } catch (e) {
    if (e instanceof SubsonicError && e.isAuthError) {
      toast.dismiss(toastId)
      useSessionStore.getState().logout()
      return
    }
    failedIds = songs.map((s) => s.id)
  }
  refresh(playlistId)

  const failed = songs.filter((s) => failedIds.includes(s.id))
  const added = songs.length - failed.length
  const options = { id: toastId, duration: 10000, action: { label: 'Open', onClick: () => onOpen(playlistId) } }
  if (failed.length === 0) {
    toast.success(`Imported “${name}”`, { ...options, description: plural(added, 'song') })
  } else {
    toast.warning(`Imported “${name}” with ${plural(failed.length, 'song')} missing`, {
      ...options,
      description: `Added ${added} of ${songs.length}. Couldn't add: ${failed.map((s) => s.title).join(', ')}`,
    })
  }
}

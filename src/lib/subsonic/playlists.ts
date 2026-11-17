import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Child, PlaylistWithSongs } from 'subsonic-api'
import { toast } from 'sonner'
import { plural } from '@/lib/format'
import { useSubsonic } from '@/stores/session'
import { isExternalId } from './external'
import { appendSongs, createPlaylistWithSongs, needsOneByOne } from './playlistSongs'

const couldntAdd = (failed: string[]) => `${plural(failed.length, 'song')} couldn't be added.`

/**
 * Runs an add, showing a progress toast when it goes song by song (behind
 * Octo-Fiesta, where each external song downloads first). The final toast
 * replaces it via the returned `toastId`; on failure it's dismissed.
 */
async function withProgress<T>(
  label: string,
  songIds: string[],
  run: (onProgress?: (index: number, songId: string) => void) => Promise<T>,
): Promise<T & { toastId?: string | number }> {
  const slow = needsOneByOne(songIds) && (songIds.length > 1 || songIds.some(isExternalId))
  if (!slow) return { ...(await run()), toastId: undefined }
  const toastId = toast.loading(label, { duration: Infinity })
  const onProgress = (i: number, id: string) =>
    toast.loading(label, { id: toastId, description: `${i + 1} of ${songIds.length}${isExternalId(id) ? ' (downloading)' : ''}`, duration: Infinity })
  try {
    return { ...(await run(onProgress)), toastId }
  } catch (e) {
    toast.dismiss(toastId)
    throw e
  }
}

/** Playlist edits. Each refreshes the affected caches and reports failures as toasts. */
export function usePlaylistMutations() {
  const client = useSubsonic()
  const qc = useQueryClient()
  const refresh = (id?: string) => {
    qc.invalidateQueries({ queryKey: ['playlists'] })
    if (id) qc.invalidateQueries({ queryKey: ['playlist', id] })
  }
  const onError = (error: Error) => toast.error(error.message)

  const create = useMutation({
    mutationFn: ({ name, songIds = [] }: { name: string; songIds?: string[] }) =>
      withProgress(`Creating “${name}”`, songIds, (onProgress) => createPlaylistWithSongs(client, name, songIds, onProgress)),
    onSuccess: ({ playlist, added, failed, toastId }, { songIds = [] }) => {
      refresh(playlist.id)
      if (failed.length) toast.warning(`Created “${playlist.name}” with ${added} of ${plural(songIds.length, 'song')}`, { id: toastId, description: couldntAdd(failed) })
      else toast(songIds.length ? `Created “${playlist.name}” with ${plural(added, 'song')}` : `Created “${playlist.name}”`, { id: toastId })
    },
    onError,
  })

  const addSongs = useMutation({
    mutationFn: ({ playlistId, name, songIds }: { playlistId: string; name: string; songIds: string[] }) =>
      withProgress(`Adding to “${name}”`, songIds, (onProgress) => appendSongs(client, playlistId, songIds, onProgress)),
    onSuccess: ({ added, failed, toastId }, { playlistId, name, songIds }) => {
      refresh(playlistId)
      if (failed.length) toast.warning(`Added ${added} of ${plural(songIds.length, 'song')} to “${name}”`, { id: toastId, description: couldntAdd(failed) })
      else toast(`Added ${plural(added, 'song')} to “${name}”`, { id: toastId })
    },
    onError: (error: Error, { playlistId }) => {
      refresh(playlistId) // some songs may have gone in before the failure
      onError(error)
    },
  })

  // Pass one index at a time when behind Octo-Fiesta: like songIdToAdd, it joins
  // repeated songIndexToRemove values into one (see playlistSongs.ts).
  const removeSongs = useMutation({
    mutationFn: ({ playlistId, indexes }: { playlistId: string; indexes: number[] }) =>
      client.get('updatePlaylist', { playlistId, songIndexToRemove: indexes }),
    onSuccess: (_, { playlistId }) => refresh(playlistId),
    onError,
  })

  const update = useMutation({
    mutationFn: ({ playlistId, ...fields }: { playlistId: string; name?: string; comment?: string; public?: boolean }) =>
      client.get('updatePlaylist', { playlistId, ...fields }),
    onSuccess: (_, { playlistId }) => refresh(playlistId),
    onError,
  })

  const remove = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => client.get('deletePlaylist', { id }),
    onSuccess: (_, { id, name }) => {
      qc.removeQueries({ queryKey: ['playlist', id] })
      refresh()
      toast(`Deleted “${name}”`)
    },
    onError,
  })

  /**
   * Reorder by replacing the song list (createPlaylist with an id overwrites
   * it; Subsonic has no "move" call). Applied optimistically.
   */
  const reorder = useMutation({
    mutationFn: ({ playlistId, songs }: { playlistId: string; songs: Child[] }) =>
      client.get('createPlaylist', { playlistId, songId: songs.map((s) => s.id) }),
    onMutate: async ({ playlistId, songs }) => {
      await qc.cancelQueries({ queryKey: ['playlist', playlistId] })
      const previous = qc.getQueryData<PlaylistWithSongs>(['playlist', playlistId])
      if (previous) qc.setQueryData(['playlist', playlistId], { ...previous, entry: songs })
      return { previous }
    },
    onError: (error, { playlistId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(['playlist', playlistId], ctx.previous)
      onError(error)
    },
    onSettled: (_, __, { playlistId }) => refresh(playlistId),
  })

  return { create, addSongs, removeSongs, update, remove, reorder }
}

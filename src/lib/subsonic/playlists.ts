import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Child, PlaylistWithSongs } from 'subsonic-api'
import { toast } from 'sonner'
import { plural } from '@/lib/format'
import { useSubsonic } from '@/stores/session'

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
    mutationFn: async ({ name, songIds = [] }: { name: string; songIds?: string[] }) =>
      (await client.get<{ playlist: PlaylistWithSongs }>('createPlaylist', { name, songId: songIds })).playlist,
    onSuccess: (playlist, { songIds = [] }) => {
      refresh()
      toast(songIds.length ? `Created “${playlist.name}” with ${plural(songIds.length, 'song')}` : `Created “${playlist.name}”`)
    },
    onError,
  })

  const addSongs = useMutation({
    mutationFn: ({ playlistId, songIds }: { playlistId: string; name: string; songIds: string[] }) =>
      client.get('updatePlaylist', { playlistId, songIdToAdd: songIds }),
    onSuccess: (_, { playlistId, name, songIds }) => {
      refresh(playlistId)
      toast(`Added ${plural(songIds.length, 'song')} to “${name}”`)
    },
    onError,
  })

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

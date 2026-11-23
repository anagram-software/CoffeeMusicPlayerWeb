import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { albumQuery } from '@/lib/subsonic/queries'
import { player } from '@/player/engine'
import { toTrack } from '@/player/queue'
import { useSubsonic } from '@/stores/session'
import type { RecItem } from './client'
import { creditNames, resolveAlbumQuery, resolveArtistQuery, resolveSongQuery } from './resolve'

/**
 * Opening and playing recommendations. Each looks the item up on the server
 * (library first, then the streaming provider through Octo-Fiesta) and falls
 * back to a search page when nothing matches exactly. `busy` is the mbid being
 * looked up, for a spinner.
 */
export function useRecActions() {
  const client = useSubsonic()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string>()

  const run = async (item: RecItem, task: () => Promise<void>) => {
    if (busy) return
    setBusy(item.mbid)
    try {
      await task()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(undefined)
    }
  }

  const searchFor = (item: RecItem, tab: 'albums' | 'artists' | undefined) => {
    const q = item.kind === 'artist' ? item.name : [creditNames(item)[0], item.name].filter(Boolean).join(' ')
    void navigate({ to: '/search', search: { q, tab } })
  }

  const openArtist = (item: RecItem) =>
    run(item, async () => {
      const id = item.subsonic_id ?? (await queryClient.fetchQuery(resolveArtistQuery(client, item)))?.id
      if (id) await navigate({ to: '/artist/$id', params: { id } })
      else searchFor(item, 'artists')
    })

  const openAlbum = (item: RecItem) =>
    run(item, async () => {
      const id = item.subsonic_id ?? (await queryClient.fetchQuery(resolveAlbumQuery(client, item)))?.id
      if (id) await navigate({ to: '/album/$id', params: { id } })
      else searchFor(item, 'albums')
    })

  const playAlbum = (item: RecItem) =>
    run(item, async () => {
      const id = item.subsonic_id ?? (await queryClient.fetchQuery(resolveAlbumQuery(client, item)))?.id
      if (!id) {
        toast(`Couldn't find “${item.name}” on your server`, { action: { label: 'Search', onClick: () => searchFor(item, 'albums') } })
        return
      }
      const album = await queryClient.fetchQuery(albumQuery(client, id))
      player.playQueue((album.song ?? []).map(toTrack), 0, { shuffle: false })
    })

  /** Plays only this song: queueing others would make Octo-Fiesta download each of them. */
  const playSong = (item: RecItem) =>
    run(item, async () => {
      const song = await queryClient.fetchQuery(resolveSongQuery(client, item))
      if (!song) {
        toast(`Couldn't find “${item.name}” on your server`, { action: { label: 'Search', onClick: () => searchFor(item, undefined) } })
        return
      }
      player.playQueue([toTrack(song)], 0, { shuffle: false })
    })

  return { busy, openArtist, openAlbum, playAlbum, playSong }
}

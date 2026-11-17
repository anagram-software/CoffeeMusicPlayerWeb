import { useState } from 'react'
import { MdLibraryAdd, MdLibraryAddCheck } from 'react-icons/md'
import type { AlbumWithSongsID3 } from 'subsonic-api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { addAlbumToLibrary, missingSongs, useAddedAlbums } from '@/lib/subsonic/addToLibrary'
import { externalProvider } from '@/lib/subsonic/external'
import { plural } from '@/lib/format'
import { useSubsonic } from '@/stores/session'

/**
 * "Add to library" for albums with streaming-provider (Qobuz) songs: has
 * Octo-Fiesta download the missing ones to the server. Renders nothing for
 * albums already fully in the library.
 */
export function AddToLibraryButton({ album }: { album: AlbumWithSongsID3 }) {
  const client = useSubsonic()
  const requested = useAddedAlbums((s) => s.ids.has(album.id))
  const [busy, setBusy] = useState(false)
  const missing = missingSongs(album)
  if (missing.length === 0) return null

  const provider = externalProvider(missing[0].id) ?? 'the streaming service'

  const add = async () => {
    setBusy(true)
    try {
      const n = await addAlbumToLibrary(client, album)
      toast(`Adding “${album.name}” to your library`, {
        description: `Downloading ${plural(n, 'song')} from ${provider}. They'll appear in your library once the server has them.`,
      })
    } catch (e) {
      toast.error(`Couldn't add “${album.name}”: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={add}
      disabled={busy || requested}
      title={`Download the ${plural(missing.length, 'song')} not in your library yet from ${provider}`}
      className="h-10 rounded-full border-foreground/30 bg-transparent px-5 tracking-wider text-foreground uppercase hover:bg-foreground/10"
    >
      {requested ? <MdLibraryAddCheck className="size-5" /> : <MdLibraryAdd className="size-5" />}
      {busy ? 'Adding…' : requested ? 'Added' : 'Add to library'}
    </Button>
  )
}

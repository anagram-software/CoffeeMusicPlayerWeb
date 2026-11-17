import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { MdCheck, MdClose, MdCloudDownload } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { plural } from '@/lib/format'
import { fetchPlaylistTracks, type LastfmPlaylistRef, parsePlaylistUrl } from '@/lib/lastfm'
import { externalProvider, isExternalId } from '@/lib/subsonic/external'
import { importPlaylist, matchTracks, type MatchedTrack } from '@/lib/subsonic/importPlaylist'
import { cn } from '@/lib/utils'
import { useSubsonic } from '@/stores/session'

type Step =
  | { kind: 'form'; error?: string }
  | { kind: 'loading'; message: string }
  | { kind: 'review'; ref: LastfmPlaylistRef; url: string; matches: MatchedTrack[] }

/**
 * Imports a public Last.fm playlist from its link: fetch the tracks, match each
 * against the library (falling back to the streaming provider through
 * Octo-Fiesta), review, then create the playlist in the background.
 */
export function LastfmImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-section="playlists" className="flex max-h-[min(85dvh,44rem)] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Last.fm</DialogTitle>
          <DialogDescription>Songs that aren’t in your library are added from Qobuz and downloaded to your server.</DialogDescription>
        </DialogHeader>
        {open && <ImportFlow onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ImportFlow({ onClose }: { onClose: () => void }) {
  const client = useSubsonic()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ kind: 'form' })
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const find = async (ref: LastfmPlaylistRef, url: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setStep({ kind: 'loading', message: 'Fetching from Last.fm…' })
      const tracks = await fetchPlaylistTracks(ref, controller.signal)
      if (tracks.length === 0) {
        setStep({ kind: 'form', error: 'That playlist is empty.' })
        return
      }
      setStep({ kind: 'loading', message: `Finding songs: 0 of ${tracks.length}` })
      const matches = await matchTracks(
        client,
        tracks,
        (done) => setStep({ kind: 'loading', message: `Finding songs: ${done} of ${tracks.length}` }),
        controller.signal,
      )
      setStep({ kind: 'review', ref, url, matches })
    } catch (e) {
      if (controller.signal.aborted) return
      setStep({ kind: 'form', error: (e as Error).message })
    }
  }

  if (step.kind === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="size-8 animate-spin rounded-full border-2 border-section border-t-transparent" />
        <p className="text-sm text-muted-foreground">{step.message}</p>
        <Button
          variant="ghost"
          onClick={() => {
            abortRef.current?.abort()
            setStep({ kind: 'form' })
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (step.kind === 'review') {
    return (
      <Review
        defaultName={`${step.ref.user}'s Last.fm playlist`}
        matches={step.matches}
        onBack={() => setStep({ kind: 'form' })}
        onImport={(name) => {
          onClose()
          void importPlaylist(client, {
            name,
            comment: `Imported from Last.fm: ${step.url}`,
            songs: step.matches.flatMap((m) => (m.song ? [m.song] : [])),
            onOpen: (id) => navigate({ to: '/playlist/$id', params: { id } }),
          })
        }}
      />
    )
  }

  return <UrlForm error={step.error} onSubmit={find} />
}

function UrlForm({ error, onSubmit }: { error?: string; onSubmit: (ref: LastfmPlaylistRef, url: string) => void }) {
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const ref = parsePlaylistUrl(url)
  const invalid = touched && url.trim() !== '' && !ref

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (ref) onSubmit(ref, `https://www.last.fm/user/${ref.user}/playlists/${ref.id}`)
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="lastfm-url">Playlist link</Label>
        <Input
          id="lastfm-url"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="https://www.last.fm/user/…/playlists/…"
          aria-invalid={invalid}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">The playlist must be public. Copy the link from the playlist’s page on last.fm.</p>
      </div>

      {invalid && <p className="text-sm text-destructive">That doesn’t look like a Last.fm playlist link.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={!ref}>
          Find songs
        </Button>
      </DialogFooter>
    </form>
  )
}

function Review({
  defaultName,
  matches,
  onBack,
  onImport,
}: {
  defaultName: string
  matches: MatchedTrack[]
  onBack: () => void
  onImport: (name: string) => void
}) {
  const [name, setName] = useState(defaultName)
  const library = matches.filter((m) => m.song && !isExternalId(m.song.id)).length
  const external = matches.filter((m) => m.song && isExternalId(m.song.id)).length
  const missing = matches.length - library - external
  const total = library + external

  return (
    <form
      className="flex min-h-0 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim() && total) onImport(name.trim())
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="lastfm-name">Playlist name</Label>
        <Input id="lastfm-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <p className="text-sm text-muted-foreground">
        {plural(library, 'song')} in your library
        {external > 0 && `, ${external} to download`}
        {missing > 0 && `, ${missing} not found`}.
      </p>

      <ol className="-mx-2 min-h-0 flex-1 overflow-y-auto">
        {matches.map(({ wanted, song }, i) => (
          <li key={i} className={cn('flex items-center gap-3 rounded-md px-2 py-1.5', !song && 'opacity-50')}>
            <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{wanted.title}</div>
              <div className="truncate text-xs text-muted-foreground">{wanted.artist}</div>
            </div>
            <MatchStatus song={song} />
          </li>
        ))}
      </ol>

      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={!name.trim() || total === 0}>
          Import {plural(total, 'song')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function MatchStatus({ song }: { song: MatchedTrack['song'] }) {
  if (!song) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title="No match in your library or on the streaming service">
        <MdClose className="size-4" /> Not found
      </span>
    )
  }
  const provider = externalProvider(song.id)
  const matched = `Matched: ${song.title} by ${song.artist}${song.album ? ` (${song.album})` : ''}`
  if (provider) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title={`${matched}. Downloaded from ${provider} when imported.`}>
        <MdCloudDownload className="size-4" /> {provider}
      </span>
    )
  }
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-section-ink" title={matched}>
      <MdCheck className="size-4" /> Library
    </span>
  )
}

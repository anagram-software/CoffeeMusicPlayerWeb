import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { MdCheck, MdClose, MdCloudDownload } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { plural } from '@/lib/format'
import { describeSource, fetchLastfmTracks, lastfmPeriods, type LastfmPeriod, type LastfmSource } from '@/lib/lastfm'
import { externalProvider, isExternalId } from '@/lib/subsonic/external'
import { importPlaylist, matchTracks, type MatchedTrack } from '@/lib/subsonic/importPlaylist'
import { cn } from '@/lib/utils'
import { useSubsonic } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { openSettings } from '@/stores/ui'

const sourceKinds = {
  loved: 'Loved tracks',
  top: 'Top tracks',
  tag: 'Top tracks for a tag',
  artist: 'Top tracks for an artist',
} as const
type SourceKind = keyof typeof sourceKinds

const inputLabels: Record<SourceKind, { label: string; placeholder: string }> = {
  loved: { label: 'Last.fm username', placeholder: 'e.g. rj' },
  top: { label: 'Last.fm username', placeholder: 'e.g. rj' },
  tag: { label: 'Tag', placeholder: 'e.g. shoegaze' },
  artist: { label: 'Artist', placeholder: 'e.g. Radiohead' },
}

const LIMITS = [25, 50, 100, 200, 500] as const

type Step =
  | { kind: 'form'; error?: string }
  | { kind: 'loading'; message: string }
  | { kind: 'review'; source: LastfmSource; matches: MatchedTrack[] }

/**
 * Imports a Last.fm track list as a playlist: fetch the list, match each track
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
  const apiKey = useSettingsStore((s) => s.lastfmApiKey)
  const client = useSubsonic()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ kind: 'form' })
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  if (!apiKey) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Add a Last.fm API key in Settings first. It’s free and only takes a minute.</p>
        <Button
          onClick={() => {
            onClose()
            openSettings('lastfm')
          }}
        >
          Open Last.fm settings
        </Button>
      </div>
    )
  }

  const find = async (source: LastfmSource, limit: number) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setStep({ kind: 'loading', message: 'Fetching from Last.fm…' })
      const tracks = await fetchLastfmTracks(apiKey, source, limit, controller.signal)
      if (tracks.length === 0) {
        setStep({ kind: 'form', error: 'Last.fm returned no tracks for that.' })
        return
      }
      setStep({ kind: 'loading', message: `Finding songs: 0 of ${tracks.length}` })
      const matches = await matchTracks(
        client,
        tracks,
        (done) => setStep({ kind: 'loading', message: `Finding songs: ${done} of ${tracks.length}` }),
        controller.signal,
      )
      setStep({ kind: 'review', source, matches })
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
        source={step.source}
        matches={step.matches}
        onBack={() => setStep({ kind: 'form' })}
        onImport={(name) => {
          onClose()
          void importPlaylist(client, {
            name,
            comment: `Imported from Last.fm: ${describeSource(step.source)}`,
            songs: step.matches.flatMap((m) => (m.song ? [m.song] : [])),
            onOpen: (id) => navigate({ to: '/playlist/$id', params: { id } }),
          })
        }}
      />
    )
  }

  return <SourceForm error={step.error} onSubmit={find} />
}

function SourceForm({ error, onSubmit }: { error?: string; onSubmit: (source: LastfmSource, limit: number) => void }) {
  const [kind, setKind] = useState<SourceKind>('loved')
  const [value, setValue] = useState('')
  const [period, setPeriod] = useState<LastfmPeriod>('overall')
  const [limit, setLimit] = useState<number>(50)

  const toSource = (v: string): LastfmSource => {
    switch (kind) {
      case 'loved':
        return { kind, user: v }
      case 'top':
        return { kind, user: v, period }
      case 'tag':
        return { kind, tag: v }
      case 'artist':
        return { kind, artist: v }
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onSubmit(toSource(value.trim()), limit)
      }}
    >
      <div className="grid gap-1.5">
        <Label>List</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as SourceKind)}>
          <SelectTrigger className="w-full" aria-label="List">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sourceKinds).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="lastfm-source">{inputLabels[kind].label}</Label>
        <Input id="lastfm-source" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={inputLabels[kind].placeholder} />
      </div>

      <div className="flex gap-3">
        {kind === 'top' && (
          <div className="grid flex-1 gap-1.5">
            <Label>Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as LastfmPeriod)}>
              <SelectTrigger className="w-full" aria-label="Period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(lastfmPeriods).map(([p, label]) => (
                  <SelectItem key={p} value={p}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid flex-1 gap-1.5">
          <Label>Songs</Label>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-full" aria-label="Number of songs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMITS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Up to {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={!value.trim()}>
          Find songs
        </Button>
      </DialogFooter>
    </form>
  )
}

function Review({
  source,
  matches,
  onBack,
  onImport,
}: {
  source: LastfmSource
  matches: MatchedTrack[]
  onBack: () => void
  onImport: (name: string) => void
}) {
  const [name, setName] = useState(() => describeSource(source))
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

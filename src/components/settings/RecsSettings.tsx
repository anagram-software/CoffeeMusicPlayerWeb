import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { Row, SettingsGroup } from './SettingsLayout'
import { Input } from '@/components/ui/input'
import { normaliseRecsUrl, type RecsClient } from '@/lib/recs/client'
import { recsStatusQuery } from '@/lib/recs/queries'
import { useRecs } from '@/lib/recs/useRecs'
import { useSettingsStore } from '@/stores/settings'

/** Coffee Recs address and key, for the Discover page. */
export function RecsSettings() {
  const { recsUrl, recsKey, set } = useSettingsStore()
  return (
    <SettingsGroup title="Recommendations" id="recommendations">
      <p className="py-3 text-xs text-muted-foreground">
        The Discover page comes from Coffee Recs, a separate service that matches your library with MusicBrainz. It must allow this site ({location.origin}) in its CORS_ORIGINS.
      </p>
      <Row label="Address">
        <CommitInput value={recsUrl} onCommit={(v) => set({ recsUrl: normaliseRecsUrl(v) })} placeholder="https://recs.example.com" aria-label="Coffee Recs address" />
      </Row>
      <Row label="API key" description="The service's API_KEY. Stored in this browser.">
        <CommitInput value={recsKey} onCommit={(v) => set({ recsKey: v.trim() })} type="password" placeholder="Key" aria-label="Coffee Recs API key" autoComplete="off" />
      </Row>
      <RecsStatusRow />
    </SettingsGroup>
  )
}

/** Saves on blur or Enter, so a half-typed key doesn't fire a request per keystroke. */
function CommitInput({ value, onCommit, ...props }: { value: string; onCommit: (value: string) => void } & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setDraft(value)
  }
  return (
    <Input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-56 max-sm:w-40"
    />
  )
}

function RecsStatusRow() {
  const recs = useRecs()
  return recs ? <RecsStatus recs={recs} /> : null
}

function RecsStatus({ recs }: { recs: RecsClient }) {
  const { data, error, isPending } = useQuery({ ...recsStatusQuery(recs), retry: false })
  return (
    <Row label="Connection">
      <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        {isPending ? (
          'Checking…'
        ) : error ? (
          <>
            <MdErrorOutline className="size-4 shrink-0 text-destructive" />
            <span className="line-clamp-2 text-right text-xs" title={error.message}>
              {error.message}
            </span>
          </>
        ) : (
          <>
            <MdCheckCircle className="size-4 shrink-0 text-section-ink" />
            <span className="truncate">
              Coffee Recs {data.version} · {data.library.confirmed} of {data.library.artists + data.library.albums} items matched
            </span>
          </>
        )}
      </span>
    </Row>
  )
}

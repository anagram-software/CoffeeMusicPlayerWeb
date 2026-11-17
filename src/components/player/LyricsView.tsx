import { useEffect, useRef } from 'react'
import { MdLyrics } from 'react-icons/md'
import { useLyrics } from '@/hooks/useLyrics'
import { activeLineIndex, isSectionHeader, type LyricLine } from '@/lib/lyrics'
import { cn } from '@/lib/utils'
import { player } from '@/player/engine'
import type { Track } from '@/player/queue'
import { usePlayerStore } from '@/player/store'
import { useSettingsStore } from '@/stores/settings'
import { openSettings } from '@/stores/ui'

/**
 * Lyrics panel for the full player (the Android app showed lyrics over the
 * art). Synced lyrics follow playback and lines can be clicked to seek;
 * plain lyrics just scroll, with section labels in an accent colour.
 */
export function LyricsView({ track, className }: { track: Track; className?: string }) {
  const { data: lyrics, isPending, isError, error } = useLyrics(track)
  const lrclibEnabled = useSettingsStore((s) => s.lrclib)

  return (
    <div className={cn('relative min-h-0 w-full overflow-hidden rounded-lg bg-foreground/5', className)}>
      {isPending ? (
        <Message>Looking for lyrics…</Message>
      ) : isError ? (
        <Message>Couldn't load lyrics: {error.message}</Message>
      ) : !lyrics ? (
        <Message>
          <MdLyrics className="mx-auto mb-3 size-10 opacity-50" />
          No lyrics for this song.
          {!lrclibEnabled && (
            <p className="mt-2 text-xs text-foreground/50">
              You can look up missing lyrics online in{' '}
              <button type="button" onClick={() => openSettings('lyrics')} className="underline">
                Settings
              </button>
              .
            </p>
          )}
        </Message>
      ) : lyrics.synced ? (
        <SyncedLines lines={lyrics.lines} />
      ) : (
        <div className="h-full overflow-y-auto px-6 pt-2 pb-8 text-center">
          {lyrics.lines.map((l, i) => (
            <p key={i} className={cn('min-h-[1.6em] text-base leading-relaxed md:text-lg', isSectionHeader(l.text) ? 'mt-4 font-medium text-[#2962ff] dark:text-[#82b1ff]' : 'text-foreground/90')}>
              {l.text}
            </p>
          ))}
        </div>
      )}
      {lyrics?.source === 'lrclib' && (
        <span className="pointer-events-none absolute right-3 bottom-2 text-[10px] text-foreground/40">Lyrics from LRCLIB</span>
      )}
    </div>
  )
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-foreground/70">{children}</div>
}

function SyncedLines({ lines }: { lines: LyricLine[] }) {
  // Selecting the index (not the time) re-renders only when the line changes.
  const active = usePlayerStore((s) => activeLineIndex(lines, s.currentTime * 1000))
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolledAt = useRef(0)

  // Keep the active line centred, unless the user scrolled in the last few seconds.
  useEffect(() => {
    if (Date.now() - userScrolledAt.current < 4000) return
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-line="${Math.max(active, 0)}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [active])

  const markUserScroll = () => (userScrolledAt.current = Date.now())

  return (
    <div
      ref={containerRef}
      onWheel={markUserScroll}
      onTouchMove={markUserScroll}
      className="h-full overflow-y-auto px-6 py-[40%] text-center [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)]"
    >
      {lines.map((l, i) => (
        <button
          key={i}
          type="button"
          data-line={i}
          onClick={() => {
            userScrolledAt.current = 0
            player.seek((l.start ?? 0) / 1000)
          }}
          className={cn(
            'block w-full py-1.5 text-lg leading-snug transition-all duration-300 md:text-xl',
            i === active ? 'scale-105 font-semibold text-foreground' : 'text-foreground/35 hover:text-foreground/70',
            !l.text && 'min-h-8',
          )}
        >
          {l.text || '♪'}
        </button>
      ))}
    </div>
  )
}

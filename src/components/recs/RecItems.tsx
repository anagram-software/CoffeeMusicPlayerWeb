import { type ReactNode, useState } from 'react'
import { MdClose, MdOpenInNew, MdPlayArrow, MdThumbUp, MdThumbUpOffAlt } from 'react-icons/md'
import { CoverArt } from '@/components/CoverArt'
import { formatDuration, formatPartialDate } from '@/lib/format'
import type { FeedbackAction, RecItem } from '@/lib/recs/client'
import { reasonText } from '@/lib/recs/reason'
import { creditNames } from '@/lib/recs/resolve'
import { cn } from '@/lib/utils'

export const REC_ROW_HEIGHT = 72
/** Caption under a release card's art: title, artist and date line, plus a two-line reason if any card has one. */
export const REC_CARD_CAPTION_HEIGHT = 56
export const REC_CARD_REASON_HEIGHT = 36

/** What the item's actions need; one instance per list (see the Discover page). */
export interface RecHandlers {
  busy?: string
  feedbackOf: (mbid: string) => FeedbackAction | undefined
  onLike: (item: RecItem) => void
  onDismiss: (item: RecItem) => void
}

function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />
}

function IconButton({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={cn('flex size-8 shrink-0 items-center justify-center rounded-full transition-colors', className)}
    >
      {children}
    </button>
  )
}

function FeedbackButtons({ item, handlers, className, buttonClass }: { item: RecItem; handlers: RecHandlers; className?: string; buttonClass?: string }) {
  const liked = handlers.feedbackOf(item.mbid) === 'like'
  return (
    <div className={cn('flex items-center', className)}>
      <IconButton label={liked ? 'Remove like' : 'More like this'} onClick={() => handlers.onLike(item)} className={cn(buttonClass, liked && 'text-section-ink')}>
        {liked ? <MdThumbUp className="size-[18px]" /> : <MdThumbUpOffAlt className="size-[18px]" />}
      </IconButton>
      <IconButton label="Not interested" onClick={() => handlers.onDismiss(item)} className={buttonClass}>
        <MdClose className="size-5" />
      </IconButton>
    </div>
  )
}

function MusicBrainzLink({ item, className }: { item: RecItem; className?: string }) {
  return (
    <a
      href={item.musicbrainz_url}
      target="_blank"
      rel="noreferrer"
      title="Open in MusicBrainz"
      aria-label={`Open ${item.name} in MusicBrainz`}
      onClick={(e) => e.stopPropagation()}
      className={cn('flex size-8 shrink-0 items-center justify-center rounded-full transition-colors', className)}
    >
      <MdOpenInNew className="size-4" />
    </a>
  )
}

/**
 * Coffee Recs' artist picture (Navidrome's for library artists, Apple Music's otherwise), over a
 * coloured initial whose hue comes from the name. The initial shows until the picture loads, and
 * stays when there is none (the service hasn't looked the artist up yet) or it fails.
 */
function ArtistAvatar({ name, src }: { name: string; src?: string | null }) {
  const [state, setState] = useState<{ src: string; status: 'loaded' | 'failed' }>()
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  const initial = [...name.replace(/^the\s+/i, '')][0]?.toUpperCase() ?? '?'
  const url = src ? appleThumb(src, 96) : undefined
  const status = state && state.src === url ? state.status : undefined
  return (
    <div
      aria-hidden
      className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-light text-white"
      style={{ background: `hsl(${Math.abs(hash) % 360} 40% 42%)` }}
    >
      {initial}
      {url && status !== 'failed' && (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setState({ src: url, status: 'loaded' })}
          onError={() => setState({ src: url, status: 'failed' })}
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-300', status === 'loaded' ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  )
}

/** Apple Music artwork URLs end in "/<w>x<h>bb.jpg" and serve any size; the service asks for 600. */
function appleThumb(url: string, size: number): string {
  return /mzstatic\.com\//.test(url) ? url.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/, `/${size}x${size}bb.$1`) : url
}

const rowClass =
  'group flex h-[72px] cursor-pointer items-center gap-4 rounded-md px-2 transition-colors outline-none hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring'
const rowButtonClass = 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground'

function activate(onActivate: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onActivate()
      }
    },
  } as const
}

export function RecArtistRow({ item, handlers, onOpen }: { item: RecItem; handlers: RecHandlers; onOpen: (item: RecItem) => void }) {
  const reason = reasonText(item)
  return (
    <div {...activate(() => onOpen(item))} className={rowClass} title={reason || undefined}>
      <ArtistAvatar name={item.name} src={item.cover_url} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm">{item.name}</span>
          {handlers.busy === item.mbid && <Spinner className="size-3.5 text-muted-foreground" />}
        </div>
        {reason && <div className="truncate text-xs text-muted-foreground">{reason}</div>}
      </div>
      <MusicBrainzLink item={item} className={cn(rowButtonClass, 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:hidden')} />
      <FeedbackButtons item={item} handlers={handlers} buttonClass={rowButtonClass} />
    </div>
  )
}

export function RecSongRow({ item, handlers, onPlay }: { item: RecItem; handlers: RecHandlers; onPlay: (item: RecItem) => void }) {
  const reason = reasonText(item)
  const busy = handlers.busy === item.mbid
  return (
    <div {...activate(() => onPlay(item))} className={rowClass}>
      <div className="relative size-12 shrink-0">
        <CoverArt id={undefined} src={item.cover_url} size={96} className="size-full rounded" />
        <div className={cn('absolute inset-0 flex items-center justify-center rounded bg-black/50 text-white transition-opacity', busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
          {busy ? <Spinner /> : <MdPlayArrow className="size-6" />}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{item.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {[creditNames(item).join(', '), item.release_name].filter(Boolean).join(' • ')}
        </div>
        {reason && (
          <div className="truncate text-xs text-muted-foreground/70" title={reason}>
            {reason}
          </div>
        )}
      </div>
      {item.length_ms ? <span className="text-xs text-muted-foreground tabular-nums max-sm:hidden">{formatDuration(item.length_ms / 1000)}</span> : null}
      <FeedbackButtons item={item} handlers={handlers} buttonClass={rowButtonClass} />
    </div>
  )
}

/** A release group: art card (opens it on your server; ▶ plays it) with feedback buttons on the art. */
export function RecReleaseCard({
  item,
  handlers,
  onOpen,
  onPlay,
  showDate,
}: {
  item: RecItem
  handlers: RecHandlers
  onOpen: (item: RecItem) => void
  onPlay: (item: RecItem) => void
  /** Full release date (new releases) instead of the year. */
  showDate?: boolean
}) {
  const reason = reasonText(item)
  const busy = handlers.busy === item.mbid
  const type = [item.primary_type, ...(item.secondary_types ?? [])].filter(Boolean).join(' + ')
  const date = showDate ? formatPartialDate(item.first_release_date) : item.first_release_date?.slice(0, 4)
  const overlayButton = 'bg-black/55 text-white/85 backdrop-blur-sm hover:bg-black/75 hover:text-white'

  return (
    <div {...activate(() => onOpen(item))} className="group block cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" title={item.name}>
      <div className="relative aspect-square overflow-hidden rounded-md shadow-md shadow-black/30">
        <CoverArt id={undefined} src={item.cover_url} size={250} className="size-full transition-transform duration-300 group-hover:scale-105" />
        {item.upcoming && (
          <span className="absolute top-2 left-2 rounded-sm bg-section px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-section-foreground uppercase">
            Upcoming
          </span>
        )}
        <FeedbackButtons
          item={item}
          handlers={handlers}
          buttonClass={overlayButton}
          className="absolute top-2 right-2 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100"
        />
        <button
          type="button"
          aria-label={`Play ${item.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onPlay(item)
          }}
          className={cn(
            'absolute right-2.5 bottom-2.5 flex size-10 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all hover:scale-105',
            busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:hidden',
          )}
        >
          {busy ? <Spinner /> : <MdPlayArrow className="size-6" />}
        </button>
        <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-white/5 ring-inset" />
      </div>
      <div className="mt-2 px-0.5">
        <div className="truncate text-sm font-medium">{item.name}</div>
        <div className="truncate text-xs text-muted-foreground">{creditNames(item).join(', ')}</div>
        <div className="truncate text-xs text-muted-foreground/80">{[date, type].filter(Boolean).join(' · ')}</div>
        {reason && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/70">{reason}</div>}
      </div>
    </div>
  )
}

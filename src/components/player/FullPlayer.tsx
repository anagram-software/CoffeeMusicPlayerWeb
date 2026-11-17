import { Link } from '@tanstack/react-router'
import { motion, useDragControls } from 'motion/react'
import { useEffect } from 'react'
import { MdKeyboardArrowDown, MdClosedCaption, MdQueueMusic } from 'react-icons/md'
import { CoverArt } from '@/components/CoverArt'
import { TrackMenu } from '@/components/library/TrackMenu'
import { Marquee } from '@/components/Marquee'
import { StarButton } from '@/components/StarButton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useArtColor } from '@/lib/artColor'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { songQuery } from '@/lib/subsonic/queries'
import { toTrack } from '@/player/queue'
import { describeQuality } from '@/player/quality'
import { useCurrentTrack, usePlayerStore } from '@/player/store'
import { useSubsonic } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { NextButton, PlayPauseButton, PreviousButton, RepeatButton, SeekBar, SeekTimes, ShuffleButton, VolumeControl } from './controls'
import { LyricsView } from './LyricsView'
import { QueueList } from './QueueList'
import { togglePanel } from './sidePanelState'

const close = () => usePlayerStore.setState({ fullPlayerOpen: false })

/**
 * Full-screen "Now playing", after the Android frag_player: large art over a
 * background tinted from the art, controls below. Slides up from the mini
 * player; drag the art/header down (or press Esc) to close.
 *
 * Queue and lyrics: on wide screens they're the app's side panel (opened from
 * the player bar), which the player covers while open. On mobile they live inside
 * the player, toggled from its header: lyrics replace the artwork, the queue
 * replaces everything below the header.
 */
export function FullPlayer() {
  const track = useCurrentTrack()
  const theme = useResolvedTheme()
  // Dark mode: a dark tint of the cover (white text). Light mode: a pastel of it (dark text).
  const tint = useArtColor(track?.coverArt, theme) ?? (theme === 'dark' ? '#2a2a2a' : '#eeeeee')
  const panel = usePlayerStore((s) => s.panel)
  const position = usePlayerStore((s) => `${s.index + 1}/${s.queue.length}`)
  const streamFormat = useSettingsStore((s) => s.streamFormat)
  const maxBitRate = useSettingsStore((s) => s.maxBitRate)
  const showQuality = useSettingsStore((s) => s.showQuality)
  // Tracks queued before format details were stored (or from sources that omit them): fetch once.
  const { data: details } = useQuery({
    ...songQuery(useSubsonic(), track?.id ?? ''),
    enabled: showQuality && !!track && !track.suffix,
    select: (song) => toTrack(song),
  })
  const dragControls = useDragControls()
  // Wide screens (1024px+): optional lyrics column. The player covers the whole app, docked side panel included.
  const wide = useMediaQuery('(min-width: 1024px)')
  const mobile = !useMediaQuery('(min-width: 768px)')
  const inlinePanel = mobile ? panel : null
  // Wide screens: optional big lyrics column beside the artwork + controls.
  const splitLyrics = usePlayerStore((s) => s.fullPlayerLyrics) && wide

  useEffect(() => {
    // Esc closes the player, unless a dialog or menu is open on top of it (that one closes instead).
    // Capture phase: runs before Radix's own Esc handling has closed that layer.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const overlayOpen = document.querySelector(
        '[role="dialog"][data-state="open"]:not([aria-label="Now playing"]), [role="menu"][data-state="open"], [role="listbox"][data-state="open"]',
      )
      if (!overlayOpen) close()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  // The queue was cleared from inside the player.
  useEffect(() => {
    if (!track) close()
  }, [track])

  if (!track) return null

  const startDrag = (e: React.PointerEvent) => dragControls.start(e)
  const quality = describeQuality(track.suffix ? track : (details ?? {}), { streamFormat, maxBitRate })

  return (
    <motion.div
      role="dialog"
      aria-label="Now playing"
      className={cn('fixed inset-0 z-40 flex flex-col text-foreground transition-[background-color] duration-700', theme === 'dark' && 'dark')}
      style={{ backgroundColor: tint }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 300 }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 120 || info.velocity.y > 600) close()
      }}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-linear-to-b',
          theme === 'dark' ? 'from-black/0 via-black/25 to-black/70' : 'from-white/0 via-white/25 to-white/70',
        )}
      />

      <header className="relative flex h-14 shrink-0 touch-none items-center justify-between px-2 md:px-4" onPointerDown={startDrag}>
        <Button variant="ghost" size="icon-lg" onClick={close} aria-label="Close player" className="text-foreground hover:bg-foreground/10">
          <MdKeyboardArrowDown className="size-7" />
        </Button>
        {/* Centred on the header itself, so the buttons on either side can't shift it. */}
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-medium tracking-wider text-foreground/70 uppercase">
          {inlinePanel === 'queue' ? 'Queue' : inlinePanel === 'lyrics' ? 'Lyrics' : 'Now playing'}
        </span>
        {wide && (
          <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
            <HeaderToggle
              label="lyrics"
              icon={MdClosedCaption}
              active={splitLyrics}
              onClick={() => usePlayerStore.setState((s) => ({ fullPlayerLyrics: !s.fullPlayerLyrics }))}
            />
          </div>
        )}
        {mobile && (
          <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
            <HeaderToggle label="lyrics" icon={MdClosedCaption} active={panel === 'lyrics'} onClick={() => togglePanel('lyrics')} />
            <HeaderToggle label="queue" icon={MdQueueMusic} active={panel === 'queue'} onClick={() => togglePanel('queue')} />
          </div>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {inlinePanel === 'queue' ? (
          // Mobile: the queue takes over the whole body.
          <QueueList className="min-h-0 flex-1" />
        ) : (
          <div className={cn('flex min-h-0 flex-1', splitLyrics && 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6')}>
            {/* min-w-0: as an item of the row above, it would otherwise grow to fit a long title. */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-6 px-6 pb-8 md:gap-8">
              {inlinePanel === 'lyrics' ? (
                // Mobile: lyrics in place of the artwork (scrollable, so no drag-to-close here).
                <LyricsView track={track} className="min-h-0 w-full flex-1" />
              ) : (
                /* Art. Dragging it down closes the player. */
                <div
                  className="flex min-h-0 w-full flex-1 touch-none items-center justify-center [container-type:size]"
                  onPointerDown={startDrag}
                >
                  {/* Square, as large as fits both ways (cq units = this container's size) */}
                  <CoverArt
                    id={track.coverArt}
                    size={1000}
                    className="size-[min(100cqw,100cqh,32rem)] rounded-lg shadow-2xl shadow-black/25 dark:shadow-black/60"
                  />
                </div>
              )}

              <div className="flex w-full max-w-xl shrink-0 flex-col gap-4">
                {/* File format and quality, quietly, right under the artwork */}
                {showQuality && inlinePanel !== 'lyrics' && quality && (
                  <p className="-mb-2 text-center text-[11px] font-medium tracking-wider text-foreground/30 uppercase tabular-nums" title="Format and quality">
                    {quality}
                  </p>
                )}
                {/* Heart · title · menu, as in the Android player */}
                <div className="flex items-center gap-2">
                  <StarButton kind="song" id={track.id} starred={track.starred} />
                  <div className="min-w-0 flex-1 text-center">
                    <Marquee as="h2" title={track.title} className="text-2xl font-light md:text-3xl">
                      {track.title}
                    </Marquee>
                    <p className="mt-1 truncate text-sm text-foreground/70">
                      <TrackLink to="artist" id={track.artistId} label={track.artist} />
                      {track.album && ' • '}
                      <TrackLink to="album" id={track.albumId} label={track.album} />
                    </p>
                  </div>
                  <TrackMenu getTracks={() => [track]} className="text-foreground/70 hover:bg-foreground/10 hover:text-foreground" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <SeekBar />
                  <SeekTimes />
                </div>

                <div className="flex items-center justify-between">
                  <ShuffleButton />
                  <PreviousButton />
                  <PlayPauseButton size="lg" />
                  <NextButton />
                  <RepeatButton />
                </div>

                <div className="flex items-center justify-center">
                  <span className="text-xs text-foreground/60 tabular-nums">{position}</span>
                </div>
                <VolumeControl className="hidden justify-center md:flex" />
              </div>
            </div>
            {splitLyrics && <LyricsView track={track} large className="mr-8 mb-8 min-h-0 bg-transparent" />}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function HeaderToggle({ label, icon: Icon, active, onClick }: { label: string; icon: typeof MdClosedCaption; active: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      aria-label={active ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={active}
      className={cn('hover:bg-foreground/10', active ? 'text-foreground' : 'text-foreground/60')}
    >
      <Icon className="size-6" />
    </Button>
  )
}

function TrackLink({ to, id, label }: { to: 'artist' | 'album'; id?: string; label?: string }) {
  if (!label) return null
  if (!id) return <>{label}</>
  return (
    <Link to={to === 'artist' ? '/artist/$id' : '/album/$id'} params={{ id }} onClick={close} className="hover:text-foreground hover:underline">
      {label}
    </Link>
  )
}

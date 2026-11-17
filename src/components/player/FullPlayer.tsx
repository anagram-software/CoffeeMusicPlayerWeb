import { Link } from '@tanstack/react-router'
import { motion, useDragControls } from 'motion/react'
import { useEffect } from 'react'
import { MdKeyboardArrowDown, MdLyrics, MdQueueMusic } from 'react-icons/md'
import { CoverArt } from '@/components/CoverArt'
import { TrackMenu } from '@/components/library/TrackMenu'
import { Marquee } from '@/components/Marquee'
import { StarButton } from '@/components/StarButton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useArtColor } from '@/lib/artColor'
import { cn } from '@/lib/utils'
import type { Track } from '@/player/queue'
import { useCurrentTrack, usePlayerStore } from '@/player/store'
import { NextButton, PlayPauseButton, PreviousButton, RepeatButton, SeekBar, SeekTimes, ShuffleButton, VolumeControl } from './controls'
import { LyricsView } from './LyricsView'
import { QueueList } from './QueueList'

const close = () => usePlayerStore.setState({ fullPlayerOpen: false })

/**
 * Full-screen "Now playing", after the Android frag_player: large art over a
 * background tinted from the art, controls below. Slides up from the mini
 * player; drag the art/header down (or press Esc) to close. The queue sits
 * beside it on wide screens and replaces the art on narrow ones.
 */
export function FullPlayer() {
  const track = useCurrentTrack()
  const theme = useResolvedTheme()
  // Dark mode: a dark tint of the cover (white text). Light mode: a pastel of it (dark text).
  const tint = useArtColor(track?.coverArt, theme) ?? (theme === 'dark' ? '#2a2a2a' : '#eeeeee')
  const panel = usePlayerStore((s) => s.panel)
  const togglePanel = (p: 'queue' | 'lyrics') => usePlayerStore.setState({ panel: panel === p ? null : p })
  const position = usePlayerStore((s) => `${s.index + 1}/${s.queue.length}`)
  const dragControls = useDragControls()
  // The queue/lyrics panel sits beside the art on wide screens (lg), in place of it on narrow ones.
  const wide = useMediaQuery('(min-width: 1024px)')

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
        <span className="text-xs font-medium tracking-wider text-foreground/70 uppercase">Now playing</span>
        <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => togglePanel('lyrics')}
            aria-label={panel === 'lyrics' ? 'Hide lyrics' : 'Show lyrics'}
            aria-pressed={panel === 'lyrics'}
            className={cn('hover:bg-foreground/10', panel === 'lyrics' ? 'text-foreground' : 'text-foreground/60')}
          >
            <MdLyrics className="size-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => togglePanel('queue')}
            aria-label={panel === 'queue' ? 'Hide queue' : 'Show queue'}
            aria-pressed={panel === 'queue'}
            className={cn('hover:bg-foreground/10', panel === 'queue' ? 'text-foreground' : 'text-foreground/60')}
          >
            <MdQueueMusic className="size-6" />
          </Button>
        </div>
      </header>

      <div className={cn('relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)]', panel && wide && 'grid-cols-[minmax(0,1fr)_26rem]')}>
        <div className="flex min-h-0 flex-col items-center justify-center gap-6 px-6 pb-8 md:gap-8">
          {/* Art (hidden on small screens while the panel is shown). Dragging it down closes the player. */}
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 touch-none items-center justify-center [container-type:size]',
              panel && !wide && 'hidden',
            )}
            onPointerDown={startDrag}
          >
            {/* Square, as large as fits both ways (cq units = this container's size) */}
            <CoverArt
              id={track.coverArt}
              size={1000}
              className="size-[min(100cqw,100cqh,32rem)] rounded-lg shadow-2xl shadow-black/25 dark:shadow-black/60"
            />
          </div>

          {panel && !wide && <SidePanel panel={panel} track={track} className="w-full flex-1" />}

          <div className="flex w-full max-w-xl shrink-0 flex-col gap-4">
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

        {panel && wide && <SidePanel panel={panel} track={track} />}
      </div>
    </motion.div>
  )
}

/** The queue or the lyrics: one panel, one at a time. */
function SidePanel({ panel, track, className }: { panel: 'queue' | 'lyrics'; track: Track; className?: string }) {
  if (panel === 'queue') return <QueueList className={className} />
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="px-4 py-3">
        <h2 className="text-sm font-medium tracking-wider text-foreground uppercase">Lyrics</h2>
      </div>
      <LyricsView track={track} className="min-h-0 flex-1 rounded-none bg-transparent" />
    </div>
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

import { Link } from '@tanstack/react-router'
import { motion, useDragControls } from 'motion/react'
import { useEffect } from 'react'
import { MdEqualizer, MdKeyboardArrowDown, MdLyrics, MdQueueMusic } from 'react-icons/md'
import { CoverArt } from '@/components/CoverArt'
import { TrackMenu } from '@/components/library/TrackMenu'
import { StarButton } from '@/components/StarButton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import { useArtColor } from '@/lib/artColor'
import { cn } from '@/lib/utils'
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
  const tint = useArtColor(track?.coverArt) ?? '#2a2a2a'
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const lyricsOpen = usePlayerStore((s) => s.lyricsOpen)
  const position = usePlayerStore((s) => `${s.index + 1}/${s.queue.length}`)
  const dragControls = useDragControls()
  // Queue beside the art on wide screens (lg), in place of it on narrow ones.
  const wide = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
      className="fixed inset-0 z-40 flex flex-col text-white transition-[background-color] duration-700"
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
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/0 via-black/25 to-black/70" />

      <header className="relative flex h-14 shrink-0 touch-none items-center justify-between px-2 md:px-4" onPointerDown={startDrag}>
        <Button variant="ghost" size="icon-lg" onClick={close} aria-label="Close player" className="text-white hover:bg-white/10">
          <MdKeyboardArrowDown className="size-7" />
        </Button>
        <span className="text-xs font-medium tracking-wider text-white/70 uppercase">Now playing</span>
        {/* On narrow screens lyrics and queue share the art's space, so opening one closes the other. */}
        <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-lg" asChild className="text-white/60 hover:bg-white/10 hover:text-white">
            <Link to="/equalizer" onClick={close} aria-label="Equalizer">
              <MdEqualizer className="size-6" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => usePlayerStore.setState({ lyricsOpen: !lyricsOpen, ...(!wide && { queueOpen: false }) })}
            aria-label={lyricsOpen ? 'Hide lyrics' : 'Show lyrics'}
            aria-pressed={lyricsOpen}
            className={cn('hover:bg-white/10', lyricsOpen ? 'text-white' : 'text-white/60')}
          >
            <MdLyrics className="size-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => usePlayerStore.setState({ queueOpen: !queueOpen, ...(!wide && { lyricsOpen: false }) })}
            aria-label={queueOpen ? 'Hide queue' : 'Show queue'}
            aria-pressed={queueOpen}
            className={cn('hover:bg-white/10', queueOpen ? 'text-white' : 'text-white/60')}
          >
            <MdQueueMusic className="size-6" />
          </Button>
        </div>
      </header>

      <div className={cn('relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)]', queueOpen && wide && 'grid-cols-[minmax(0,1fr)_26rem]')}>
        <div className="flex min-h-0 flex-col items-center justify-center gap-6 px-6 pb-8 md:gap-8">
          {/* Art or lyrics (hidden on small screens while the queue is shown). Dragging the art closes the player; lyrics scroll instead. */}
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]',
              !lyricsOpen && 'touch-none',
              queueOpen && !wide && 'hidden',
            )}
            onPointerDown={lyricsOpen ? undefined : startDrag}
          >
            {lyricsOpen ? (
              <LyricsView track={track} className="h-full max-w-2xl" />
            ) : (
              /* Square, as large as fits both ways (cq units = this container's size) */
              <CoverArt
                id={track.coverArt}
                size={1000}
                className="size-[min(100cqw,100cqh,32rem)] rounded-lg shadow-2xl shadow-black/60"
              />
            )}
          </div>

          {queueOpen && !wide && <QueueList className="w-full flex-1" />}

          <div className="flex w-full max-w-xl shrink-0 flex-col gap-4">
            {/* Heart · title · menu, as in the Android player */}
            <div className="flex items-center gap-2">
              <StarButton kind="song" id={track.id} starred={track.starred} />
              <div className="min-w-0 flex-1 text-center">
                <h2 className="truncate text-2xl font-light md:text-3xl">{track.title}</h2>
                <p className="mt-1 truncate text-sm text-white/70">
                  <TrackLink to="artist" id={track.artistId} label={track.artist} />
                  {track.album && ' • '}
                  <TrackLink to="album" id={track.albumId} label={track.album} />
                </p>
              </div>
              <TrackMenu getTracks={() => [track]} className="text-white/70 hover:bg-white/10 hover:text-white" />
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
              <span className="text-xs text-white/60 tabular-nums">{position}</span>
            </div>
            <VolumeControl className="hidden justify-center md:flex" />
          </div>
        </div>

        {queueOpen && wide && <QueueList className="border-l border-white/10 bg-black/20" />}
      </div>
    </motion.div>
  )
}

function TrackLink({ to, id, label }: { to: 'artist' | 'album'; id?: string; label?: string }) {
  if (!label) return null
  if (!id) return <>{label}</>
  return (
    <Link to={to === 'artist' ? '/artist/$id' : '/album/$id'} params={{ id }} onClick={close} className="hover:text-white hover:underline">
      {label}
    </Link>
  )
}

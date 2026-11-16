import { useState } from 'react'
import {
  MdPause,
  MdPlayArrow,
  MdRepeat,
  MdRepeatOne,
  MdShuffle,
  MdSkipNext,
  MdSkipPrevious,
  MdVolumeDown,
  MdVolumeOff,
  MdVolumeUp,
} from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { player } from '@/player/engine'
import { usePlayerStore } from '@/player/store'

/** Big white circular play/pause, as in the Android player. */
export function PlayPauseButton({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const playing = usePlayerStore((s) => s.playing)
  const buffering = usePlayerStore((s) => s.buffering && s.playing)
  const disabled = usePlayerStore((s) => s.index === -1)
  const Icon = playing ? MdPause : MdPlayArrow
  return (
    <button
      type="button"
      onClick={() => player.togglePlay()}
      disabled={disabled}
      aria-label={playing ? 'Pause' : 'Play'}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100',
        size === 'sm' && 'size-9',
        size === 'md' && 'size-11',
        size === 'lg' && 'size-16',
        className,
      )}
    >
      <Icon className={size === 'lg' ? 'size-9' : 'size-6'} />
      {buffering && <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-section" />}
    </button>
  )
}

export function PreviousButton({ className }: { className?: string }) {
  const disabled = usePlayerStore((s) => s.index === -1)
  return (
    <Button variant="ghost" size="icon-lg" onClick={() => player.previous()} disabled={disabled} aria-label="Previous" className={className}>
      <MdSkipPrevious className="size-7" />
    </Button>
  )
}

export function NextButton({ className }: { className?: string }) {
  const disabled = usePlayerStore((s) => s.index === -1 || (s.repeat === 'off' && s.index >= s.queue.length - 1))
  return (
    <Button variant="ghost" size="icon-lg" onClick={() => player.next()} disabled={disabled} aria-label="Next" className={className}>
      <MdSkipNext className="size-7" />
    </Button>
  )
}

export function ShuffleButton({ className }: { className?: string }) {
  const shuffle = usePlayerStore((s) => s.shuffle)
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={() => player.toggleShuffle()}
      aria-label="Shuffle"
      aria-pressed={shuffle}
      className={cn(shuffle ? 'text-white' : 'text-white/40', className)}
    >
      <MdShuffle className="size-5" />
    </Button>
  )
}

export function RepeatButton({ className }: { className?: string }) {
  const repeat = usePlayerStore((s) => s.repeat)
  const Icon = repeat === 'one' ? MdRepeatOne : MdRepeat
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={() => player.cycleRepeat()}
      aria-label={`Repeat: ${repeat}`}
      className={cn(repeat === 'off' ? 'text-white/40' : 'text-white', className)}
    >
      <Icon className="size-5" />
    </Button>
  )
}

/**
 * Seek slider with elapsed/total times. While dragging, the slider shows the
 * drag position and only seeks on release.
 */
export function SeekBar({ className, compact }: { className?: string; compact?: boolean }) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const disabled = usePlayerStore((s) => s.index === -1)
  const [dragging, setDragging] = useState<number | null>(null)
  const shown = dragging ?? currentTime

  const time = (t: number) => <span className="w-10 shrink-0 text-xs text-white/60 tabular-nums">{formatDuration(t)}</span>

  return (
    <div className={cn('flex items-center gap-3', compact && 'gap-2', className)}>
      {compact && time(shown)}
      <Slider
        aria-label="Seek"
        min={0}
        max={duration || 1}
        step={0.1}
        value={[Math.min(shown, duration || 1)]}
        disabled={disabled}
        onValueChange={([v]) => setDragging(v)}
        onValueCommit={([v]) => {
          player.seek(v)
          setDragging(null)
        }}
        className="**:data-[slot=slider-range]:bg-white **:data-[slot=slider-thumb]:border-white **:data-[slot=slider-track]:bg-white/20"
      />
      {compact && <span className="w-10 shrink-0 text-right text-xs text-white/60 tabular-nums">{formatDuration(duration)}</span>}
    </div>
  )
}

export function SeekTimes() {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  return (
    <div className="flex justify-between text-xs text-white/60 tabular-nums">
      <span>{formatDuration(currentTime)}</span>
      <span>{formatDuration(duration)}</span>
    </div>
  )
}

export function VolumeControl({ className }: { className?: string }) {
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const Icon = muted || volume === 0 ? MdVolumeOff : volume < 0.5 ? MdVolumeDown : MdVolumeUp
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button variant="ghost" size="icon" onClick={() => player.toggleMute()} aria-label={muted ? 'Unmute' : 'Mute'}>
        <Icon className="size-5" />
      </Button>
      <Slider
        aria-label="Volume"
        min={0}
        max={1}
        step={0.01}
        value={[muted ? 0 : volume]}
        onValueChange={([v]) => player.setVolume(v)}
        className="w-24 **:data-[slot=slider-range]:bg-white **:data-[slot=slider-thumb]:border-white **:data-[slot=slider-track]:bg-white/20"
      />
    </div>
  )
}

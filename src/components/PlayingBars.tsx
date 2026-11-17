import { cn } from '@/lib/utils'

/** Animated "now playing" equalizer bars; frozen when paused. */
export function PlayingBars({ playing, className, barClassName = 'bg-section' }: { playing: boolean; className?: string; /** Bar colour (default: the section accent). */ barClassName?: string }) {
  return (
    <span aria-label={playing ? 'Playing' : 'Paused'} className={cn('flex h-3.5 items-end gap-0.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('w-0.75 origin-bottom rounded-full animate-[playing-bar_0.9s_ease-in-out_infinite]', barClassName)}
          style={{ height: '100%', animationDelay: `${i * -0.3}s`, animationPlayState: playing ? 'running' : 'paused' }}
        />
      ))}
    </span>
  )
}

import { cn } from '@/lib/utils'

/** Animated "now playing" equalizer bars; frozen when paused. */
export function PlayingBars({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span aria-label={playing ? 'Playing' : 'Paused'} className={cn('flex h-3.5 items-end gap-0.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-0.75 origin-bottom rounded-full bg-section animate-[playing-bar_0.9s_ease-in-out_infinite]"
          style={{ height: '100%', animationDelay: `${i * -0.3}s`, animationPlayState: playing ? 'running' : 'paused' }}
        />
      ))}
    </span>
  )
}
